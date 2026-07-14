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
            .introspect({ token: response.access_token });

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
            .introspect({ token: response.refresh_token });

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
            .introspect({ token: response.refresh_token });

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
            .introspect({ token: response.refresh_token });

        expect(introspectResponse.active).toBeFalsy();
    });
});
