/*
 * Copyright (c) 2025.
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
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
    buildIdentityProviderAuthorizeCallbackPath,
    buildIdentityProviderAuthorizePath,
} from '@authup/core-kit';
import { createFakeOAuth2IdentityProvider } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

function buildFakeAccessToken(claims: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({
        alg: 'none',
        typ: 'JWT' 
    }));
    const payload = btoa(JSON.stringify(claims));
    return `${header}.${payload}.fakesignature`;
}

function createFakeIdpServer(): {
    server: Server,
    start: () => Promise<string>,
    stop: () => Promise<void> 
} {
    const server = createServer((req, res) => {
        if (req.url === '/token' && req.method === 'POST') {
            const accessToken = buildFakeAccessToken({
                sub: 'fake-idp-user-123',
                email: 'idp-user@example.com',
                name: 'IDP User',
            });

            res.writeHead(200, {
                'Content-Type': 'application/json' 
            });
            res.end(JSON.stringify({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: 3600,
            }));
            return;
        }

        if (req.url === '/authorize') {
            res.writeHead(200, {
                'Content-Type': 'text/plain' 
            });
            res.end('authorize');
            return;
        }

        res.writeHead(404);
        res.end();
    });

    return {
        server,
        start: () => new Promise<string>((resolve) => {
            server.listen(0, '127.0.0.1', () => {
                const address = server.address() as AddressInfo;
                resolve(`http://127.0.0.1:${address.port}`);
            });
        }),
        stop: () => new Promise<void>((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        }),
    };
}

describe('identity-provider authorization code grant', () => {
    const suite = createTestApplication();
    const fakeIdp = createFakeIdpServer();
    let fakeIdpBaseURL: string;
    let providerId: string;

    beforeAll(async () => {
        await suite.setup();
        fakeIdpBaseURL = await fakeIdp.start();

        const provider = await suite.client
            .identityProvider
            .create(createFakeOAuth2IdentityProvider({
                token_url: `${fakeIdpBaseURL}/token`,
                authorize_url: `${fakeIdpBaseURL}/authorize`,
            }));

        providerId = provider.id;
    });

    afterAll(async () => {
        await fakeIdp.stop();
        await suite.teardown();
    });

    it('should redirect to external IDP with state on authorize-out', async () => {
        const response = await suite.client
            .get(
                buildIdentityProviderAuthorizePath(providerId),
                {
                    redirect: 'manual' 
                },
            );

        expect(response.status).toEqual(302);

        const location = response.headers.get('location') as string;
        expect(location).toBeDefined();

        const redirectURL = new URL(location);
        expect(redirectURL.origin).toEqual(fakeIdpBaseURL);
        expect(redirectURL.searchParams.get('state')).toBeDefined();
    });

    it('should exchange IDP code for authup authorization code via authorize-in, then for tokens', async () => {
        const authorizeOutResponse = await suite.client
            .get(
                buildIdentityProviderAuthorizePath(providerId),
                {
                    redirect: 'manual' 
                },
            );

        const outLocation = authorizeOutResponse.headers.get('location') as string;
        const outURL = new URL(outLocation);
        const state = outURL.searchParams.get('state');

        expect(state).toBeDefined();

        const authorizeInResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizeCallbackPath(providerId)}?code=fake-idp-code&state=${state}`,
                {
                    redirect: 'manual' 
                },
            );

        expect(authorizeInResponse.status).toEqual(302);

        const inLocation = authorizeInResponse.headers.get('location') as string;
        expect(inLocation).toBeDefined();

        const inURL = new URL(inLocation);
        const authupCode = inURL.searchParams.get('code');
        expect(authupCode).toBeDefined();
        expect(authupCode!.length).toBeGreaterThan(0);

        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                code: authupCode!,
            });

        expect(tokenResponse).toBeDefined();
        expect(tokenResponse.access_token).toBeDefined();
        expect(tokenResponse.expires_in).toBeDefined();
        expect(tokenResponse.refresh_token).toBeDefined();
    });

    it('should reject reuse of authorization code (single-use)', async () => {
        const authorizeOutResponse = await suite.client
            .get(
                buildIdentityProviderAuthorizePath(providerId),
                {
                    redirect: 'manual' 
                },
            );

        const outLocation = authorizeOutResponse.headers.get('location') as string;
        const state = new URL(outLocation).searchParams.get('state');

        const authorizeInResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizeCallbackPath(providerId)}?code=fake-idp-code&state=${state}`,
                {
                    redirect: 'manual' 
                },
            );

        const inLocation = authorizeInResponse.headers.get('location') as string;
        const authupCode = new URL(inLocation).searchParams.get('code');

        await suite.client
            .token
            .createWithAuthorizationCode({
                code: authupCode! 
            });

        let error: any;

        try {
            await suite.client
                .token
                .createWithAuthorizationCode({
                    code: authupCode! 
                });
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
    });
});
