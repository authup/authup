/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { ErrorCode } from '@authup/errors';
import { OAuth2InjectionToken } from '../../../../../../src/app/modules/oauth2/constants';
import { createTestApplication } from '../../../../../app';
import { expectClientError, httpRequest } from '../../../../../utils';

/**
 * An EXPIRED token is read and reported rather than raised: the caller gets
 * `active: false` alongside the payload and the subject's claims, so a
 * third-party app can say "your session ended, <name>" instead of only "no".
 * It answered 401 before, which said nothing about whose token it was.
 *
 * A token that cannot be read at all keeps raising. Reporting one as inactive
 * would claim this server issued it and let it lapse.
 */
describe('token-introspect', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should report an expired token as inactive and still name its subject', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        const payload = await suite.client
            .token
            .introspect({ token: response.access_token });

        expect(payload.active).toBeTruthy();

        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const now = Math.floor(Date.now() / 1000);
        const expiredToken = await signer.sign({
            jti: payload.jti,
            sub: payload.sub,
            sub_kind: payload.sub_kind,
            realm_id: payload.realm_id,
            client_id: payload.client_id,
            kind: payload.kind,
            session_id: payload.session_id,
            iat: now - 7200,
            exp: now - 3600,
        });

        const introspection = await suite.client
            .token
            .introspect({ token: expiredToken });

        expect(introspection.active).toBe(false);

        // the point of reading it rather than refusing it: the caller can name
        // the account whose session ended
        expect(introspection.sub).toEqual(payload.sub);
        expect(introspection.sub_kind).toEqual(payload.sub_kind);
        expect((introspection as Record<string, any>).name).toEqual('admin');
    });

    // Without the controller deriving `active` from `exp`, this is the
    // regression that bites: `ignoreExpiry` makes the verify accept the token,
    // and the signature-keyed cache returns a hit without re-checking `exp`
    // either, so the report would say the token is live.
    it('should not report an expired token as active', async () => {
        const grant = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        const current = await suite.client
            .token
            .introspect({ token: grant.access_token });

        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const now = Math.floor(Date.now() / 1000);
        const justExpired = await signer.sign({
            jti: current.jti,
            sub: current.sub,
            sub_kind: current.sub_kind,
            realm_id: current.realm_id,
            client_id: current.client_id,
            kind: current.kind,
            session_id: current.session_id,
            iat: now - 60,
            exp: now - 1,
        });

        expect((await suite.client.token.introspect({ token: justExpired })).active).toBe(false);
    });

    it('should refuse a malformed token', async () => {
        // not a report about a token this server issued
        await expectClientError(
            () => suite.client.token.introspect({ token: 'not-a-json-web-token' }),
            { status: 401 },
        );
    });

    it('should refuse a token signed under an unknown key', async () => {
        // A `kid` naming no resolvable key answered 404 (`JWK_NOT_FOUND`)
        // before it became a JWTError.
        const header = Buffer
            .from(JSON.stringify({
                alg: 'RS256', 
                typ: 'JWT', 
                kid: '6b0f4a5c-0d2e-4f1a-9c3b-8e7d6f5a4b3c', 
            }))
            .toString('base64url');
        const body = Buffer
            .from(JSON.stringify({ sub: 'someone', exp: Math.floor(Date.now() / 1000) + 3600 }))
            .toString('base64url');

        await expectClientError(
            () => suite.client.token.introspect({ token: `${header}.${body}.signature` }),
            { status: 401 },
        );
    });

    // The token PARAMETER is still part of the request contract: a body without
    // one is malformed, not a report about a token.
    it('should reject a request carrying no token', async () => {
        await expectClientError(
            () => suite.client.token.introspect({ token: '' } as any),
            { status: 400 },
        );
    });

    it('should not challenge the caller when reporting an expired token', async () => {
        const grant = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        const current = await suite.client
            .token
            .introspect({ token: grant.access_token });

        const signer = suite.container.resolve(OAuth2InjectionToken.TokenSigner);
        const now = Math.floor(Date.now() / 1000);
        const expiredToken = await signer.sign({
            jti: current.jti,
            sub: current.sub,
            sub_kind: current.sub_kind,
            realm_id: current.realm_id,
            client_id: current.client_id,
            kind: current.kind,
            session_id: current.session_id,
            iat: now - 7200,
            exp: now - 3600,
        });

        // the report is a 200 about the TOKEN, not a 401 about the caller
        const response = await httpRequest(suite, 'POST', '/token/introspect', { form: { token: expiredToken } });

        expect(response.status).toEqual(200);
        expect(response.headers.get('www-authenticate')).toBeNull();
        expect((await response.json()).active).toBe(false);
    });
});

/**
 * RFC 6750 §3: a 401 from a protected resource carries the Bearer challenge.
 * The gate is the request's own Authorization header, so the token endpoint's
 * `invalid_client` 401 (RFC 6749 §5.2) must not get one.
 */
describe('bearer challenge', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should challenge a dead bearer on a protected route', async () => {
        const response = await httpRequest(suite, 'GET', '/users/@me', { headers: { authorization: 'Bearer not-a-json-web-token' } });

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toContain('Bearer');
        expect(response.headers.get('www-authenticate')).toContain('error="invalid_token"');
    });

    it('should challenge a request carrying no credentials at all', async () => {
        const response = await httpRequest(suite, 'GET', '/users/@me');

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toEqual('Bearer');
    });

    it('should not challenge the token endpoint', async () => {
        // invalid_client is a 401 too, and it is not a bearer failure
        const response = await httpRequest(suite, 'POST', '/token', {
            form: {
                grant_type: 'client_credentials',
                client_id: 'system',
                client_secret: 'definitely-wrong',
            },
        });

        expect(response.status).toEqual(401);
        expect(response.headers.get('www-authenticate')).toBeNull();
        expect((await response.json()).code).toEqual(ErrorCode.OAUTH_CLIENT_INVALID);
    });
});
