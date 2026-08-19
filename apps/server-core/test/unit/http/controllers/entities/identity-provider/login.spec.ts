/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { Client, IdentityProvider, Realm } from '@authup/core-kit';
import { IdentityProviderProtocol, ScopeName } from '@authup/core-kit';
import { ErrorCode } from '@authup/errors';
import { OAuth2InjectionToken } from '../../../../../../src/app/modules/oauth2/constants';
import {
    createFakeClient,
    createFakeOAuth2IdentityProvider,
    createFakeRealm,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

const USER_AGENT = 'login-spec-agent';

const REDIRECT_URI = 'https://example.com/login/callback';
const CODE_VERIFIER = 'aVeryLongCodeVerifierValueUsedByThePublicClient1234567890';

const encode = (input: Record<string, any>) => Buffer.from(JSON.stringify(input)).toString('base64url');

// A code the fake provider rejects, so the token exchange fails the way a
// real provider fails it: an answer, not a transport error.
const REJECTED_CODE = 'rejected-code';

describe('identity-provider login flow', () => {
    const suite = createTestApplication();

    let idpServer: Server;
    let idpURL: string;

    let realm: Realm;
    let provider: IdentityProvider;
    let client: Client;
    let codeChallenge: string;

    let tokenRequestBody: URLSearchParams | undefined;
    let userInfoRequests = 0;

    beforeAll(async () => {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CODE_VERIFIER));
        codeChallenge = Buffer.from(new Uint8Array(digest)).toString('base64url');

        // A minimal external IdP. Unlike a permissive stub, its token
        // endpoint enforces the one thing RFC 6749 §4.1.3 makes
        // mandatory: the `code` parameter. A stub that answers every
        // request with a token cannot catch a client that never sends
        // the code at all.
        idpServer = createServer((req, res) => {
            if (req.url && req.url.startsWith('/token')) {
                let raw = '';
                req.on('data', (chunk) => {
                    raw += chunk;
                });
                req.on('end', () => {
                    tokenRequestBody = new URLSearchParams(raw);

                    res.setHeader('content-type', 'application/json');

                    if (!tokenRequestBody.get('code')) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({ error: 'invalid_request' }));
                        return;
                    }

                    if (tokenRequestBody.get('code') === REJECTED_CODE) {
                        res.statusCode = 400;
                        res.end(JSON.stringify({
                            error: 'invalid_grant',
                            error_description: 'the authorization code expired',
                        }));
                        return;
                    }

                    // An authup-shaped access token: subject, kind and realm,
                    // and no username at all. It is the whole reason the
                    // id_token has to be read (#3434).
                    const accessToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
                        sub: 'external-user-1',
                        kind: 'access_token',
                        realm_name: 'master',
                    })}.x`;
                    const idToken = `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
                        sub: 'external-user-1',
                        // authup carries the username here; preferred_username
                        // and nickname map to the nullable display name
                        name: 'external-user',
                        email: 'external@example.com',
                    })}.x`;
                    res.end(JSON.stringify({
                        access_token: accessToken,
                        id_token: idToken,
                        token_type: 'Bearer',
                    }));
                });
                return;
            }

            if (req.url && req.url.startsWith('/userinfo')) {
                userInfoRequests += 1;
                res.setHeader('content-type', 'application/json');
                res.end(JSON.stringify({
                    // MUST match the token subject: OIDC Core 5.3.2 requires a
                    // mismatched document to be discarded, and it is
                    // (`should discard a userinfo document whose subject does
                    // not match` in the authenticator spec)
                    sub: 'external-user-1',
                    preferred_username: 'userinfo-user',
                    email: 'userinfo@example.com',
                }));
                return;
            }

            res.statusCode = 404;
            res.end();
        });
        await new Promise<void>((resolve) => {
            idpServer.listen(0, '127.0.0.1', resolve);
        });
        idpURL = `http://127.0.0.1:${(idpServer.address() as AddressInfo).port}`;

        await suite.setup();

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        provider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
        }))).data;

        // The RP whose authorization request the federated login completes:
        // a public client, so PKCE and state are mandatory.
        client = (await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            redirectUri: 'https://example.com/**',
        }))).data;
        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });
    });

    afterAll(async () => {
        await suite.teardown();
        await new Promise<void>((resolve, reject) => {
            idpServer.close((err) => (err ? reject(err) : resolve()));
        });
    });

    function buildCodeRequest() {
        return encode({
            response_type: 'code',
            client_id: client.id,
            realm_id: realm.id,
            redirect_uri: REDIRECT_URI,
            scope: ScopeName.GLOBAL,
            state: 'rp-state-value',
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });
    }

    async function authorizeOut(providerId = provider.id): Promise<string> {
        const response = await httpRequest(suite, 'GET', `identity-providers/${providerId}/authorize-out?codeRequest=${buildCodeRequest()}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });
        expect(response.status).toEqual(302);

        const location = response.headers.get('location');
        expect(location).toBeTruthy();

        const state = new URL(location as string).searchParams.get('state');
        expect(state).toBeTruthy();

        return state as string;
    }

    it('refuses to start a federated login without a code request', async () => {
        // The callback used to complete such a login by minting a code bound
        // to no client, no redirect_uri and no PKCE challenge, and handing it
        // to the server root (issue #3457).
        const response = await httpRequest(suite, 'GET', `identity-providers/${provider.id}/authorize-out`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });

        expect(response.status).toEqual(400);
        expect(response.headers.get('location')).toBeNull();
    });

    it('refuses to start a federated login at a disabled provider', async () => {
        const payload = createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
        });
        const disabled = (await suite.client.identityProvider.create(payload)).data;
        await suite.client.identityProvider.update(disabled.id, {
            ...payload,
            protocol: IdentityProviderProtocol.OAUTH2,
            enabled: false,
        });

        const response = await httpRequest(suite, 'GET', `identity-providers/${disabled.id}/authorize-out?codeRequest=${buildCodeRequest()}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });

        expect(response.status).toEqual(400);
        expect(response.headers.get('location')).toBeNull();
    });

    it('refuses a callback whose state carries no code request', async () => {
        // authorize-out no longer mints such a state; one minted before the
        // change is refused at the callback, before the provider is contacted.
        const stateManager = suite.container.resolve(OAuth2InjectionToken.AuthorizationStateManager);
        const state = await stateManager.save({ ip: '', userAgent: USER_AGENT });

        tokenRequestBody = undefined;

        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code-0`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );

        expect(response.status).toEqual(400);
        expect(response.headers.get('location')).toBeNull();
        expect(tokenRequestBody).toBeUndefined();
    });

    it('sends the authorization code to the provider token endpoint', async () => {
        const state = await authorizeOut();

        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code-1`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );

        expect(tokenRequestBody).toBeDefined();
        expect(tokenRequestBody?.get('grant_type')).toEqual('authorization_code');
        expect(tokenRequestBody?.get('code')).toEqual('external-code-1');

        expect(response.status).toEqual(302);
    });

    it('rejects a callback carrying no authorization code', async () => {
        // a fresh state — the previous one was consumed above
        const state = await authorizeOut();

        tokenRequestBody = undefined;

        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );

        expect(response.status).toEqual(400);

        // the provider must not be contacted at all — a code-less exchange
        // has nothing to redeem
        expect(tokenRequestBody).toBeUndefined();
    });

    it('answers a rejected token exchange as a bad gateway', async () => {
        const state = await authorizeOut();

        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=${REJECTED_CODE}`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );

        // The caller's request was fine, the provider's answer was not.
        // Mirroring the upstream 400 would read as "your request was
        // malformed", so a failed outbound dependency is a 502 instead.
        expect(response.status).toEqual(502);

        const body = await response.json();
        expect(body.code).toEqual(ErrorCode.UPSTREAM_ERROR);
        // the outbound target must not be echoed back to the caller
        expect(JSON.stringify(body)).not.toContain(idpURL);
    });

    /**
     * The reported defect (#3434): federating authup to authup provisioned
     * the local user under the remote subject UUID, because the identity was
     * derived from the access token alone and authup's carries no username.
     */
    it('provisions the user from the id_token claims rather than the subject', async () => {
        const state = await authorizeOut();

        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code-2`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );
        expect(response.status).toEqual(302);

        // and not the remote subject, which is a UUID against another authup
        const { data: users } = await suite.client.user.getMany({ filters: { realmId: realm.id } });
        expect(users.map((user) => user.name)).toContain('external-user');

        // `email` is a select:false column, so no read surface returns it and
        // the placeholder it replaces is not assertable here. The candidate
        // ladder that feeds it is pinned in the authenticator spec instead.
    });

    it('enriches the identity from userinfo when the provider declares one', async () => {
        const userInfoProvider = (await suite.client.identityProvider.create(createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
            userInfoUrl: `${idpURL}/userinfo`,
        }))).data;

        userInfoRequests = 0;

        const state = await authorizeOut(userInfoProvider.id);

        const response = await httpRequest(
            suite,
            'GET',
            `identity-providers/${userInfoProvider.id}/authorize-in?state=${state}&code=external-code-3`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );
        expect(response.status).toEqual(302);
        expect(userInfoRequests).toEqual(1);

        const { data: users } = await suite.client.user.getMany({ filters: { realmId: realm.id } });
        // userinfo is the richest source, so its preferred_username wins the
        // ladder over the id_token's `name`
        expect(users.map((user) => user.name)).toContain('userinfo-user');

        // the account key stays the ACCESS token subject: deriving it from a
        // richer claim set would orphan every existing account row
        const { data: accounts } = await suite.client.identityProviderAccount.getMany({ filters: { providerId: userInfoProvider.id } });
        expect(accounts).toHaveLength(1);
        expect(accounts[0].providerUserId).toEqual('external-user-1');
    });
});
