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
import {
    EventName,
    EventRefType,
    EventScope,
    IdentityProviderProtocol,
    IdentityType,
    ScopeName,
} from '@authup/core-kit';
import { OAuth2ErrorCode } from '@authup/specs';
import {
    createFakeClient,
    createFakeOAuth2IdentityProvider,
    createFakeRealm,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

const USER_AGENT = 'login-completion-spec-agent';

const REDIRECT_URI = 'https://example.com/login/callback';
const STATE = 'rp-state-value';
const NONCE = 'rp-nonce-value';

// PKCE pair, exactly as a public client sends it: every provisioned console
// client is authMethod `none`, so the code flow is unusable without one.
const CODE_VERIFIER = 'aVeryLongCodeVerifierValueUsedByThePublicClient1234567890';

const encode = (input: Record<string, any>) => Buffer.from(JSON.stringify(input)).toString('base64url');

const decodeJWTPayload = (token: string) => JSON.parse(
    Buffer.from(token.split('.')[1], 'base64url').toString('utf-8'),
);

describe('identity-provider login completion', () => {
    const suite = createTestApplication();

    let idpServer: Server;
    let idpURL: string;

    let realm: Realm;
    let provider: IdentityProvider;
    let client: Client;
    let codeChallenge: string;
    let providerTokenCalls = 0;

    beforeAll(async () => {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(CODE_VERIFIER));
        codeChallenge = Buffer.from(new Uint8Array(digest)).toString('base64url');

        // A minimal external provider: its token endpoint answers with an
        // unsigned JWT whose `sub` identifies the external user. It counts its
        // calls, because "the provider was never contacted" is the only
        // observable proof that a refused completion spends neither the
        // provider's single-use code nor a local user row.
        idpServer = createServer((req, res) => {
            if (req.url && req.url.startsWith('/token')) {
                providerTokenCalls += 1;
                req.on('data', () => { /* drain */ });
                req.on('end', () => {
                    res.setHeader('content-type', 'application/json');
                    res.end(JSON.stringify({
                        access_token: `${encode({ alg: 'none', typ: 'JWT' })}.${encode({
                            sub: 'external-user-completion',
                            email: 'external-completion@example.com',
                        })}.x`,
                        token_type: 'Bearer',
                    }));
                });
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

        // A PUBLIC client, like every provisioned console client: authMethod
        // none, so PKCE and state are mandatory at /authorize and PKCE is
        // enforced again at /token.
        client = (await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            redirectUri: 'https://example.com/**',
        }))).data;

        for (const scopeName of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const { data: scope } = await suite.client.scope.getOne(scopeName);
            await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });
        }
    });

    afterAll(async () => {
        await suite.teardown();
        await new Promise<void>((resolve, reject) => {
            idpServer.close((err) => (err ? reject(err) : resolve()));
        });
    });

    function buildCodeRequest(overrides: Record<string, any> = {}) {
        return Buffer.from(JSON.stringify({
            response_type: 'code',
            client_id: client.id,
            realm_id: realm.id,
            redirect_uri: REDIRECT_URI,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            state: STATE,
            nonce: NONCE,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            ...overrides,
        })).toString('base64url');
    }

    /**
     * The federated round trip: /authorize -> provider -> the callback.
     * Returns the Location the browser is sent to afterwards.
     */
    async function runFederatedLogin(codeRequest = buildCodeRequest()): Promise<URL> {
        const out = await httpRequest(suite, 'GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${codeRequest}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });
        expect(out.status).toEqual(302);

        const state = new URL(out.headers.get('location') as string).searchParams.get('state');
        expect(state).toBeTruthy();

        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );
        expect(back.status).toEqual(302);

        return new URL(back.headers.get('location') as string);
    }

    const exchange = (form: Record<string, string>) => httpRequest(suite, 'POST', 'token', {
        form: {
            grant_type: 'authorization_code',
            ...form,
        },
    });

    it('returns the browser to the relying party, not to the hosted authorize page', async () => {
        const location = await runFederatedLogin();

        // The code is bound to this client_id and this redirect_uri, so the RP
        // is the only party that can redeem it. Sending the browser anywhere
        // else strands the login on a page that cannot use the code.
        expect(`${location.origin}${location.pathname}`).toEqual(REDIRECT_URI);
        expect(location.searchParams.get('code')).toBeTruthy();
        expect(location.searchParams.get('state')).toEqual(STATE);
    });

    it('mints a code the public client redeems with its PKCE verifier', async () => {
        const location = await runFederatedLogin();

        const response = await exchange({
            code: location.searchParams.get('code') as string,
            client_id: client.id,
            redirect_uri: REDIRECT_URI,
            code_verifier: CODE_VERIFIER,
        });

        expect(response.status).toEqual(200);
        await expect(response.json()).resolves.toMatchObject({
            access_token: expect.any(String),
            refresh_token: expect.any(String),
        });
    });

    it('carries the PKCE challenge onto the code rather than dropping it', async () => {
        const location = await runFederatedLogin();

        // The complement of the test above: a code minted WITHOUT the
        // challenge would accept any verifier (nothing to compare against),
        // so only a rejected wrong verifier proves the challenge is on the code.
        const response = await exchange({
            code: location.searchParams.get('code') as string,
            client_id: client.id,
            redirect_uri: REDIRECT_URI,
            code_verifier: `${CODE_VERIFIER}-wrong`,
        });

        expect(response.status).toEqual(400);
        await expect(response.json()).resolves.toMatchObject({
            error: OAuth2ErrorCode.INVALID_GRANT,
            message: expect.stringContaining('code_verifier'),
        });
    });

    it('carries the nonce onto the id_token of an openid login', async () => {
        const location = await runFederatedLogin();

        const response = await exchange({
            code: location.searchParams.get('code') as string,
            client_id: client.id,
            redirect_uri: REDIRECT_URI,
            code_verifier: CODE_VERIFIER,
        });

        const body = await response.json();
        expect(body.id_token).toBeTruthy();
        expect(decodeJWTPayload(body.id_token)).toMatchObject({
            nonce: NONCE,
            aud: client.id,
        });

        // The id_token is minted at this exchange, so its `sid` must name the
        // session this exchange created rather than anything the callback held.
        const introspection = await suite.client.token.introspect({ token: body.access_token });
        expect(decodeJWTPayload(body.id_token).sid).toEqual(introspection.session_id);
    });

    // These two document /token's binding contract, which predates and
    // survives this fix. They are here because that contract is the reason the
    // code has to be delivered to the RP: keep them as context, not as the
    // regression guard for the delivery itself.
    it('refuses the code to anyone but the client it was issued to', async () => {
        // No client at all - the shape the hosted page's router guard sends,
        // and the reason handing it that code stranded the login.
        const anonymousCode = (await runFederatedLogin()).searchParams.get('code') as string;

        const anonymous = await exchange({
            code: anonymousCode,
            redirect_uri: REDIRECT_URI,
            code_verifier: CODE_VERIFIER,
        });
        expect(anonymous.status).toEqual(401);
        await expect(anonymous.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.INVALID_CLIENT });

        // The refusal happened before the code was looked at, so the RP can
        // still redeem it. Without this the next assertion could not tell
        // "wrong client" from "code already burnt".
        const afterAnonymous = await exchange({
            code: anonymousCode,
            client_id: client.id,
            redirect_uri: REDIRECT_URI,
            code_verifier: CODE_VERIFIER,
        });
        expect(afterAnonymous.status).toEqual(200);

        // A different client, correctly authenticated as itself, against a
        // code no other attempt has touched.
        const secret = 'other-client-secret';
        const other = (await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            secret,
            secretHashed: false,
            secretEncrypted: false,
            authMethod: 'secret',
            redirectUri: 'https://example.com/**',
        }))).data;

        const foreign = await exchange({
            code: (await runFederatedLogin()).searchParams.get('code') as string,
            client_id: other.id,
            client_secret: secret,
            redirect_uri: REDIRECT_URI,
            code_verifier: CODE_VERIFIER,
        });
        expect(foreign.status).toEqual(400);
        await expect(foreign.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.INVALID_GRANT });
    });

    it('lets the code be redeemed once only', async () => {
        const location = await runFederatedLogin();
        const form = {
            code: location.searchParams.get('code') as string,
            client_id: client.id,
            redirect_uri: REDIRECT_URI,
            code_verifier: CODE_VERIFIER,
        };

        expect((await exchange(form)).status).toEqual(200);

        // The code now travels over a redirect to a third-party origin, so it
        // reaches proxies, referrers and browser history. Single use is what
        // bounds that exposure.
        const replay = await exchange(form);
        expect(replay.status).toEqual(400);
        await expect(replay.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.INVALID_GRANT });
    });

    it('records the authorization in the audit log', async () => {
        await runFederatedLogin();

        // The interactive path records this inside OAuth2Authorization; this
        // leg issues its code directly, so a federated login would otherwise be
        // the one authorization that leaves no trace.
        const { data: events } = await suite.client.event.getMany({
            filters: {
                name: EventName.AUTHORIZE,
                clientId: client.id,
            },
            sort: { createdAt: 'DESC' },
            pagination: { limit: 5 },
        });

        expect(events.length).toBeGreaterThan(0);
        expect(events[0]).toMatchObject({
            scope: EventScope.OAUTH2,
            name: EventName.AUTHORIZE,
            refType: EventRefType.CLIENT,
            refId: client.id,
            clientId: client.id,
            actorType: IdentityType.USER,
        });
        expect(events[0].data).toMatchObject({
            reason: 'federated',
            providerId: provider.id,
        });
    });

    it('issues no code once the provider was disabled', async () => {
        const payload = createFakeOAuth2IdentityProvider({
            realmId: realm.id,
            tokenUrl: `${idpURL}/token`,
            authorizeUrl: `${idpURL}/authorize`,
        });
        const disabledProvider = (await suite.client.identityProvider.create(payload)).data;

        const out = await httpRequest(suite, 'GET', `identity-providers/${disabledProvider.id}/authorize-out?codeRequest=${buildCodeRequest()}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });
        const state = new URL(out.headers.get('location') as string).searchParams.get('state');

        // Disabling a provider has to stop the logins already in flight, not
        // only the ones that have yet to start.
        // The update carries the whole payload: protocol and the OAuth2
        // attributes are required in every validator group.
        await suite.client.identityProvider.update(disabledProvider.id, {
            ...payload,
            protocol: IdentityProviderProtocol.OAUTH2,
            enabled: false,
        });

        providerTokenCalls = 0;

        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${disabledProvider.id}/authorize-in?state=${state}&code=external-code`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );

        expect(back.status).toEqual(400);
        expect(back.headers.get('location')).toBeNull();
        expect(providerTokenCalls).toEqual(0);
    });

    it('issues no code to an inactive user', async () => {
        // Provision the external user through a first, successful login.
        await runFederatedLogin();

        const { data: users } = await suite.client.user.getMany({ filters: { realmId: realm.id } });
        const user = users.find((row) => row.name !== 'admin');
        expect(user).toBeDefined();

        await suite.client.user.update((user as { id: string }).id, { active: false });

        // The subject is shared with every other federated login in this file,
        // so the reactivation belongs in `finally`. Left to the happy path, one
        // failed assertion here would deactivate the user for the rest of the
        // run and fail every later test that logs in.
        try {
            const out = await httpRequest(suite, 'GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${buildCodeRequest()}`, {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            });
            const state = new URL(out.headers.get('location') as string).searchParams.get('state');

            // A federated login must not be the way around the deactivation the
            // local login path enforces.
            const back = await httpRequest(
                suite,
                'GET',
                `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
                {
                    headers: { 'user-agent': USER_AGENT },
                    redirect: 'manual',
                },
            );

            expect(back.headers.get('location')).toBeNull();
            expect(back.status).toBeGreaterThanOrEqual(400);
        } finally {
            await suite.client.user.update((user as { id: string }).id, { active: true });
        }
    });

    it('issues no code when the redirect_uri stopped matching a registered pattern', async () => {
        const moved = (await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            redirectUri: 'https://example.com/**',
        }))).data;

        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: moved.id });

        const codeRequest = buildCodeRequest({ client_id: moved.id, scope: ScopeName.GLOBAL });

        const out = await httpRequest(suite, 'GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${codeRequest}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });
        const state = new URL(out.headers.get('location') as string).searchParams.get('state');

        // The redirect below is only safe because the verifier throws on a
        // pattern mismatch. Nothing else on the callback path re-checks it, so
        // this is the test that stops that throw being refactored away.
        await suite.client.client.update(moved.id, { redirectUri: 'https://elsewhere.example.org/**' });

        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );

        expect(back.status).toEqual(400);
        expect(back.headers.get('location')).toBeNull();
        await expect(back.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.INVALID_GRANT });
    });

    it('refuses the code to a redirect_uri other than the one it was bound to', async () => {
        const location = await runFederatedLogin();

        const response = await exchange({
            code: location.searchParams.get('code') as string,
            client_id: client.id,
            redirect_uri: 'https://example.com/elsewhere',
            code_verifier: CODE_VERIFIER,
        });

        expect(response.status).toEqual(400);
        await expect(response.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.INVALID_GRANT });
    });

    it('issues no code when the client was deactivated while the user was away', async () => {
        const disabled = (await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            redirectUri: 'https://example.com/**',
        }))).data;

        for (const scopeName of [ScopeName.GLOBAL]) {
            const { data: scope } = await suite.client.scope.getOne(scopeName);
            await suite.client.clientScope.create({ scopeId: scope.id, clientId: disabled.id });
        }

        const codeRequest = buildCodeRequest({ client_id: disabled.id, scope: ScopeName.GLOBAL });

        const out = await httpRequest(suite, 'GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${codeRequest}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });
        const state = new URL(out.headers.get('location') as string).searchParams.get('state');

        // The client is verified again at completion, so a deactivation that
        // lands while the user is at the provider still takes effect.
        await suite.client.client.update(disabled.id, { active: false });

        providerTokenCalls = 0;

        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
            {
                headers: { 'user-agent': USER_AGENT },
                redirect: 'manual',
            },
        );

        // An inactive client is refused (401 invalid_client), and crucially the
        // browser is not redirected anywhere carrying a code.
        expect(back.status).toEqual(401);
        expect(back.headers.get('location')).toBeNull();
        await expect(back.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.INVALID_CLIENT });

        // The refusal happens before the provider is contacted, so a doomed
        // completion spends neither the provider's single-use code nor a local
        // user row. This is what pins the verify-then-authenticate order.
        expect(providerTokenCalls).toEqual(0);
    });
});
