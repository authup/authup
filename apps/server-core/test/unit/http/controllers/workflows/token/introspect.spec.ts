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
 * RFC 7662 §2.2: a token that is not active, does not exist, or cannot be
 * verified is REPORTED as `active: false`, never raised as an error. Expired,
 * malformed and unknown-`kid` tokens took the global JWT status mapping to 401
 * (404 for the last), so a caller could not tell a dead token from a rejected
 * introspection request.
 */
describe('token-introspect', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should report an expired token as inactive', async () => {
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
    });

    it('should report a malformed token as inactive', async () => {
        const introspection = await suite.client
            .token
            .introspect({ token: 'not-a-json-web-token' });

        expect(introspection.active).toBe(false);
    });

    it('should report a token signed under an unknown key as inactive', async () => {
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

        const introspection = await suite.client
            .token
            .introspect({ token: `${header}.${body}.signature` });

        expect(introspection.active).toBe(false);
    });

    // The token PARAMETER is still part of the request contract: a body without
    // one is malformed, not a report about a token.
    it('should reject a request carrying no token', async () => {
        await expectClientError(
            () => suite.client.token.introspect({ token: '' } as any),
            { status: 400 },
        );
    });

    it('should not answer a 401 with a bearer challenge for a dead token', async () => {
        // the whole point of the change: nothing about a dead token is a 401
        const response = await httpRequest(suite, 'POST', '/token/introspect', { form: { token: 'not-a-json-web-token' } });

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
