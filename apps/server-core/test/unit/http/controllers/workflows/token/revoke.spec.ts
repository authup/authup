/*
 * Copyright (c) 2024.
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
import { OAuth2InjectionToken } from '../../../../../../src/app/modules/oauth2/constants';
import { createTestApplication } from '../../../../../app';
import { httpRequest } from '../../../../../utils';

describe('token-revoke', () => {
    const suite = createTestApplication();

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('should revoke access token', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.access_token).toBeDefined();

        await suite.client
            .token
            .revoke({ token: response.access_token });

        const introspectResponse = await suite.client
            .token
            .introspect({ token: response.access_token }, { authorizationHeaderInherit: true });

        expect(introspectResponse).toBeDefined();
        expect(introspectResponse.active).toBeFalsy();
    });

    it('should revoke refresh token', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        expect(response).toBeDefined();
        expect(response.refresh_token).toBeDefined();

        await suite.client
            .token
            .revoke({ token: response.refresh_token });

        const introspectResponse = await suite.client
            .token
            .introspect({ token: response.refresh_token }, { authorizationHeaderInherit: true });

        expect(introspectResponse).toBeDefined();
        expect(introspectResponse.active).toBeFalsy();
    });

    // Regression: revoking an EXPIRED (but validly-signed) token must succeed
    // per RFC 7009 §2.2 — the endpoint used to `verify()` with full expiry
    // validation and threw `expired_token`, so the caller's
    // revoke-then-clear-cookie flow aborted and a stale refresh cookie survived.
    it('should revoke an expired token without erroring', async () => {
        const response = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        const payload = await suite.client
            .token
            .introspect({ token: response.refresh_token }, { authorizationHeaderInherit: true });

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

        // must resolve, not reject with `expired_token`
        await expect(
            suite.client.token.revoke({ token: expiredToken }),
        ).resolves.not.toThrow();

        const introspectResponse = await suite.client
            .token
            .introspect({ token: response.refresh_token }, { authorizationHeaderInherit: true });

        expect(introspectResponse.active).toBeFalsy();
    });

    // Same clause, the other half: "invalid tokens do not cause an error
    // response since the client cannot handle such an error in a reasonable
    // way". Expiry was already bypassed; these two answered 401 and 404.
    it('should answer its ordinary success for a malformed token', async () => {
        await expect(
            suite.client.token.revoke({ token: 'not-a-json-web-token' }),
        ).resolves.not.toThrow();
    });

    // RFC 7009 §2.2 names 200, and names it for BOTH cases. The property that
    // matters is that they are indistinguishable, so this pins them together:
    // changing one without the other reintroduces the oracle.
    it('should answer 200 for a revoked and an unreadable token alike', async () => {
        const grant = await suite.client
            .token
            .createWithPassword({
                username: 'admin',
                password: 'start123',
            });

        const revoked = await httpRequest(suite, 'POST', '/token/revoke', { form: { token: grant.access_token } });
        const unreadable = await httpRequest(suite, 'POST', '/token/revoke', { form: { token: 'not-a-json-web-token' } });

        expect(revoked.status).toEqual(200);
        expect(unreadable.status).toEqual(revoked.status);
    });

    it('should answer its ordinary success for a token signed under an unknown key', async () => {
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

        await expect(
            suite.client.token.revoke({ token: `${header}.${body}.signature` }),
        ).resolves.not.toThrow();
    });
});
