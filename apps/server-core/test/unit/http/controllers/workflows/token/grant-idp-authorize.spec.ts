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
import { BuiltInPolicyType } from '@authup/access';
import type { Client } from '@authup/core-kit';
import {
    IdentityType,
    ScopeName,
    buildIdentityProviderAuthorizeCallbackPath,
    buildIdentityProviderAuthorizePath,
} from '@authup/core-kit';
import { base64URLEncode } from '@authup/kit';
import { OAuth2ErrorCode } from '@authup/specs';
import { createFakeClient, createFakeOAuth2IdentityProvider } from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

function buildFakeAccessToken(claims: Record<string, unknown>): string {
    const header = btoa(JSON.stringify({
        alg: 'none',
        typ: 'JWT', 
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

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                access_token: accessToken,
                token_type: 'Bearer',
                expires_in: 3600,
            }));
            return;
        }

        if (req.url === '/authorize') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
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
    let client: Client;
    let clientSecret: string;
    let encodedCodeRequest: string;

    beforeAll(async () => {
        await suite.setup();
        fakeIdpBaseURL = await fakeIdp.start();

        const { data: provider } = await suite.client
            .identityProvider
            .create(createFakeOAuth2IdentityProvider({
                tokenUrl: `${fakeIdpBaseURL}/token`,
                authorizeUrl: `${fakeIdpBaseURL}/authorize`,
            }));

        providerId = provider.id;

        clientSecret = 'idp-test-secret';
        client = (await suite.client
            .client
            .create(createFakeClient({
                secret: clientSecret,
                secretHashed: false,
                secretEncrypted: false,
                authMethod: 'secret',
                tokenBindingMethod: 'none',
            }))).data;

        for (const scopeName of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const { data: scope } = await suite.client.scope.getOne(scopeName);
            await suite.client.clientScope.create({
                scopeId: scope.id,
                clientId: client.id,
            });
        }

        encodedCodeRequest = base64URLEncode(JSON.stringify({
            response_type: 'code',
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: ScopeName.GLOBAL,
        }));
    });

    afterAll(async () => {
        await fakeIdp.stop();
        await suite.teardown();
    });

    it('should redirect to external IDP with state on authorize-out', async () => {
        const response = await suite.client
            .get(
                `${buildIdentityProviderAuthorizePath(providerId)}?codeRequest=${encodedCodeRequest}`,
                { redirect: 'manual' },
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
                `${buildIdentityProviderAuthorizePath(providerId)}?codeRequest=${encodedCodeRequest}`,
                { redirect: 'manual' },
            );

        const outLocation = authorizeOutResponse.headers.get('location') as string;
        const outURL = new URL(outLocation);
        const state = outURL.searchParams.get('state');

        expect(state).toBeDefined();

        const authorizeInResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizeCallbackPath(providerId)}?code=fake-idp-code&state=${state}`,
                { redirect: 'manual' },
            );

        expect(authorizeInResponse.status).toEqual(302);

        const inLocation = authorizeInResponse.headers.get('location') as string;
        expect(inLocation).toBeDefined();

        const inURL = new URL(inLocation);
        const authupCode = inURL.searchParams.get('code');
        expect(authupCode).toBeDefined();
        expect(authupCode!.length).toBeGreaterThan(0);

        // A confidential client takes the same delivery: the code goes to its
        // own redirect_uri, not to the hosted authorize page. This request
        // carries no `state`, so none is echoed (never `state=undefined`).
        expect(`${inURL.origin}${inURL.pathname}`).toEqual('https://example.com/redirect');
        expect(inURL.searchParams.has('state')).toBe(false);

        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: client.id,
                client_secret: clientSecret,
                redirect_uri: 'https://example.com/redirect',
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
                `${buildIdentityProviderAuthorizePath(providerId)}?codeRequest=${encodedCodeRequest}`,
                { redirect: 'manual' },
            );

        const outLocation = authorizeOutResponse.headers.get('location') as string;
        const state = new URL(outLocation).searchParams.get('state');

        const authorizeInResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizeCallbackPath(providerId)}?code=fake-idp-code&state=${state}`,
                { redirect: 'manual' },
            );

        const inLocation = authorizeInResponse.headers.get('location') as string;
        const authupCode = new URL(inLocation).searchParams.get('code');

        await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: client.id,
                client_secret: clientSecret,
                redirect_uri: 'https://example.com/redirect',
                code: authupCode!,
            });

        let error: unknown;

        try {
            await suite.client
                .token
                .createWithAuthorizationCode({
                    client_id: client.id,
                    client_secret: clientSecret,
                    redirect_uri: 'https://example.com/redirect',
                    code: authupCode!,
                });
        } catch (e) {
            error = e;
        }

        expect(error).toBeDefined();
    });

    // plan 042 item 6: the id_token is minted at the /token exchange, so a
    // session-less (federated) openid login now yields an id_token — previously
    // the IdP-callback code carried none, so openid RPs got no id_token at all.
    it('should return an id_token with a sid for an openid federated login', async () => {
        const openidCodeRequest = base64URLEncode(JSON.stringify({
            response_type: 'code',
            client_id: client.id,
            redirect_uri: 'https://example.com/redirect',
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
        }));

        const authorizeOutResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizePath(providerId)}?codeRequest=${openidCodeRequest}`,
                { redirect: 'manual' },
            );

        const state = new URL(authorizeOutResponse.headers.get('location') as string)
            .searchParams.get('state');

        const authorizeInResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizeCallbackPath(providerId)}?code=fake-idp-code&state=${state}`,
                { redirect: 'manual' },
            );

        const authupCode = new URL(authorizeInResponse.headers.get('location') as string)
            .searchParams.get('code');

        const tokenResponse = await suite.client
            .token
            .createWithAuthorizationCode({
                client_id: client.id,
                client_secret: clientSecret,
                redirect_uri: 'https://example.com/redirect',
                code: authupCode!,
            });

        expect(tokenResponse.id_token).toBeDefined();

        const payload = JSON.parse(
            Buffer.from(tokenResponse.id_token!.split('.')[1], 'base64url').toString('utf8'),
        ) as { sid?: unknown };

        expect(typeof payload.sid).toEqual('string');
        expect((payload.sid as string).length).toBeGreaterThan(0);

        const introspection = await suite.client.token.introspect({ token: tokenResponse.access_token });
        expect(payload.sid).toEqual(introspection.session_id);
    });

    // Application access policy (plan 052), federated leg: the callback never
    // redirects to the RP directly — a denial bounces back to the hosted
    // authorize page with error=access_denied, and NO code is issued.
    it('should bounce a policy-denied federated login back to the hosted authorize page', async () => {
        // an identity policy restricted to clients denies the federated user
        const { data: denyPolicy } = await suite.client.policy.createBuiltIn({
            name: 'idp-access-deny',
            type: BuiltInPolicyType.IDENTITY,
            invert: false,
            types: [IdentityType.CLIENT],
            realmId: null,
        });
        await suite.client.client.update(client.id, { accessPolicyId: denyPolicy.id });

        const authorizeOutResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizePath(providerId)}?codeRequest=${encodedCodeRequest}`,
                { redirect: 'manual' },
            );

        const state = new URL(authorizeOutResponse.headers.get('location') as string)
            .searchParams.get('state');

        const authorizeInResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizeCallbackPath(providerId)}?code=fake-idp-code&state=${state}`,
                { redirect: 'manual' },
            );

        expect(authorizeInResponse.status).toEqual(302);

        const inURL = new URL(authorizeInResponse.headers.get('location') as string);
        expect(inURL.pathname.endsWith('/authorize')).toBe(true);
        expect(inURL.searchParams.get('error')).toEqual(OAuth2ErrorCode.ACCESS_DENIED);
        expect(inURL.searchParams.get('code')).toBeNull();
        // the original code request rides along so the hosted page can render it
        expect(inURL.searchParams.get('client_id')).toEqual(client.id);
    });

    it('should issue a code again once the access policy is cleared', async () => {
        await suite.client.client.update(client.id, { accessPolicyId: null });

        const authorizeOutResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizePath(providerId)}?codeRequest=${encodedCodeRequest}`,
                { redirect: 'manual' },
            );

        const state = new URL(authorizeOutResponse.headers.get('location') as string)
            .searchParams.get('state');

        const authorizeInResponse = await suite.client
            .get(
                `${buildIdentityProviderAuthorizeCallbackPath(providerId)}?code=fake-idp-code&state=${state}`,
                { redirect: 'manual' },
            );

        expect(authorizeInResponse.status).toEqual(302);

        const inURL = new URL(authorizeInResponse.headers.get('location') as string);
        expect(inURL.searchParams.get('error')).toBeNull();
        expect(inURL.searchParams.get('code')).toBeTruthy();
    });
});
