/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ScopeName } from '@authup/core-kit';
import { 
    afterAll, 
    beforeAll, 
    describe, 
    expect, 
    it, 
} from 'vitest';
import { createFakeClient, createFakeOAuth2IdentityProvider, httpRequest } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

/**
 * The pending login rides a cookie, so its Path decides whether the browser
 * sends it back at all. A wrong Path fails silently: every federated login
 * simply stops completing, and no server-side assertion notices, because the
 * specs elsewhere set the Cookie header by hand.
 *
 * A sub-path deployment is where that breaks first, since every route sits
 * under publicUrl's own base path.
 */
describe('identity-provider login cookie (sub-path deployment)', () => {
    const suite = createTestApplication({
        config: (config) => {
            config.publicUrl = 'https://example.com/auth/';
        },
    });

    beforeAll(async () => {
        await suite.setup();
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('scopes the cookie to the provider routes under the base path', async () => {
        const { data: client } = await suite.client.client.create(createFakeClient({
            authMethod: 'none',
            redirectUri: 'https://app.example.com/**',
        }));
        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });

        const { data: provider } = await suite.client.identityProvider.create(
            createFakeOAuth2IdentityProvider({
                tokenUrl: 'https://provider.example.com/token',
                authorizeUrl: 'https://provider.example.com/authorize',
            }),
        );

        const codeRequest = Buffer.from(JSON.stringify({
            response_type: 'code',
            client_id: client.id,
            redirect_uri: 'https://app.example.com/callback',
            scope: ScopeName.GLOBAL,
            state: 'rp-state',
            code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
            code_challenge_method: 'S256',
        })).toString('base64url');

        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-out?codeRequest=${codeRequest}`,
            { redirect: 'manual' },
        );

        expect(response.status).toEqual(302);

        const setCookie = response.headers.get('set-cookie') ?? '';
        expect(setCookie).toContain('authup_federated_login=');
        expect(setCookie).toContain('Path=/auth/identity-providers');
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie.toLowerCase()).toContain('samesite=lax');
        // publicUrl is https here, so the cookie must not travel in the clear
        expect(setCookie).toContain('Secure');
    });
});
