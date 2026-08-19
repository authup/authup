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
    vi,
} from 'vitest';
import type { Client, IdentityProvider, Realm } from '@authup/core-kit';
import {
    EventName,
    EventRefType,
    EventScope,
    IdentityProviderProtocol,
    IdentityType,
    ScopeName,
    UserAuthenticatorKind,
} from '@authup/core-kit';
import { OAuth2ErrorCode } from '@authup/specs';
import { OAuth2InjectionToken } from '../../../../../../src/app/modules/oauth2/constants';
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
    // MFA on for the whole file: no user here holds a factor unless a test
    // enrolls one, so every other case is unaffected, and the gate below is
    // the point of plan 094.
    const suite = createTestApplication({
        config: (config) => {
            config.mfaEnabled = true;
        },
    });

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
     * A browser's cookie jar, which `fetch` does not keep for us. The pending
     * login rides one, so the specs have to carry it from the callback to the
     * completion the way a browser would.
     */
    let pendingLoginCookie : string | null = null;
    let lastCallbackResponse : Response | null = null;

    function readPendingLoginCookie(response: Response) : string | null {
        const header = response.headers.get('set-cookie');
        if (!header) {
            return null;
        }

        const match = header.match(/authup_federated_login=([^;]*)/);

        return match && match[1].length > 0 ? match[1] : null;
    }

    /**
     * The federated round trip: /authorize -> provider -> the callback.
     * Returns the Location the browser is sent to afterwards, which since
     * plan 094 is always the hosted authorize page.
     */
    async function runFederatedLogin(codeRequest = buildCodeRequest()): Promise<URL> {
        const out = await httpRequest(suite, 'GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${codeRequest}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });
        expect(out.status).toEqual(302);

        const state = new URL(out.headers.get('location') as string).searchParams.get('state');
        expect(state).toBeTruthy();

        // the browser carries the nonce the start set, which is what stops a
        // crafted callback URL establishing a session somewhere else
        const nonce = readPendingLoginCookie(out);
        expect(nonce).toBeTruthy();

        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
            {
                headers: {
                    'user-agent': USER_AGENT,
                    cookie: `authup_federated_login=${nonce}`,
                },
                redirect: 'manual',
            },
        );
        expect(back.status).toEqual(302);

        lastCallbackResponse = back;
        pendingLoginCookie = readPendingLoginCookie(back);

        return new URL(back.headers.get('location') as string);
    }

    function completeRequest(hosted: URL, cookie = pendingLoginCookie) {
        return httpRequest(
            suite,
            'POST',
            `identity-providers/${hosted.searchParams.get('provider')}/login-complete`,
            {
                headers: {
                    'user-agent': USER_AGENT,
                    ...(cookie ? { cookie: `authup_federated_login=${cookie}` } : {}),
                },
            },
        );
    }

    /**
     * The browser half of plan 094: the hosted page completes the login the
     * callback established, then posts the consent that issues the RP's code.
     * Everything the interactive ladder enforces sits between these two calls.
     */
    async function completePendingLogin(hosted: URL): Promise<string> {
        const response = await completeRequest(hosted);
        expect(response.status).toEqual(200);

        const grant = await response.json();
        expect(grant.access_token).toBeTruthy();

        return grant.access_token;
    }

    async function completeFederatedLogin(codeRequest = buildCodeRequest()): Promise<URL> {
        const hosted = await runFederatedLogin(codeRequest);
        const accessToken = await completePendingLogin(hosted);

        const approve = await httpRequest(suite, 'POST', 'authorize', {
            headers: {
                authorization: `Bearer ${accessToken}`,
                'content-type': 'application/json',
                'user-agent': USER_AGENT,
            },
            body: Buffer.from(codeRequest, 'base64url').toString('utf-8'),
        });
        expect(approve.status).toEqual(200);

        const { url } = await approve.json();

        return new URL(url);
    }

    /**
     * A refused completion is a top-level browser navigation, so it bounces
     * to the hosted authorize page carrying the original code request (the
     * page re-renders the refusal), never a code, and at most a marker from
     * the closed set `serve()` recognizes.
     */
    function expectHostedBounce(response: Response, clientId: string, error: string | null) {
        expect(response.status).toEqual(302);

        // built from publicUrl, like every hosted-page link
        const url = new URL(response.headers.get('location') as string);
        expect(url.pathname.endsWith('/authorize')).toBe(true);
        expect(url.searchParams.get('client_id')).toEqual(clientId);
        expect(url.searchParams.get('redirect_uri')).toEqual(REDIRECT_URI);
        // the whole request rides along, so the page re-renders it as the
        // client sent it (a public client needs state + PKCE to render at all)
        expect(url.searchParams.get('state')).toEqual(STATE);
        expect(url.searchParams.get('code_challenge')).toEqual(codeChallenge);
        expect(url.searchParams.get('code_challenge_method')).toEqual('S256');
        expect(url.searchParams.get('scope')).toContain(ScopeName.GLOBAL);
        expect(url.searchParams.get('code')).toBeNull();
        expect(url.searchParams.get('error')).toEqual(error);
    }

    const exchange = (form: Record<string, string>) => httpRequest(suite, 'POST', 'token', {
        form: {
            grant_type: 'authorization_code',
            ...form,
        },
    });

    it('returns the browser to the hosted authorize page carrying no secret', async () => {
        const location = await runFederatedLogin();

        // No code is minted here (plan 094). The person goes back to the
        // hosted page, which completes the login and then runs the gates an
        // interactive login runs before the RP's code exists. The pending
        // login rides a cookie, so the URL carries nothing redeemable.
        expect(location.pathname.endsWith('/authorize')).toBe(true);
        expect(location.searchParams.get('code')).toBeNull();
        expect(pendingLoginCookie).toBeTruthy();
        expect(location.search).not.toContain(pendingLoginCookie as string);
        expect(location.searchParams.get('provider')).toEqual(provider.id);

        // the attributes are the binding: another origin cannot set it, a
        // cross-site request does not send it, and script cannot read it
        const setCookie = lastCallbackResponse?.headers.get('set-cookie') ?? '';
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie.toLowerCase()).toContain('samesite=lax');
        expect(setCookie).toContain('Path=/identity-providers');
        // the whole request rides along, so the page renders it unchanged
        expect(location.searchParams.get('client_id')).toEqual(client.id);
        expect(location.searchParams.get('state')).toEqual(STATE);
        expect(location.searchParams.get('code_challenge')).toEqual(codeChallenge);
    });

    it('delivers the code to the relying party at the end of the ladder', async () => {
        const location = await completeFederatedLogin();

        // The code is bound to this client_id and this redirect_uri, so the RP
        // is the only party that can redeem it. Sending the browser anywhere
        // else strands the login on a page that cannot use the code.
        expect(`${location.origin}${location.pathname}`).toEqual(REDIRECT_URI);
        expect(location.searchParams.get('code')).toBeTruthy();
        expect(location.searchParams.get('state')).toEqual(STATE);
    });

    it('refuses a replayed completion', async () => {
        const hosted = await runFederatedLogin();
        const cookie = pendingLoginCookie;

        await completePendingLogin(hosted);

        const response = await completeRequest(hosted, cookie);
        expect(response.status).toEqual(400);
    });

    /**
     * The browser binding. Only the browser the callback answered carries the
     * cookie, and no other origin can set it, so an attacker who starts a
     * federated login for their own account cannot hand the resulting URL to
     * someone else and have their browser adopt that session.
     */
    /**
     * The callback establishes a session, so a crafted callback URL opened in
     * someone else's browser would otherwise plant the attacker's session
     * there. The state's own ip / user agent cannot stop that: both are
     * chosen by whoever mints the state (#3439).
     */
    it('refuses a callback from a browser that did not start the login', async () => {
        const out = await httpRequest(suite, 'GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${buildCodeRequest()}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });
        const state = new URL(out.headers.get('location') as string).searchParams.get('state');

        const tokenCallsBefore = providerTokenCalls;

        // same state, no cookie: another browser following the same URL
        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
            { headers: { 'user-agent': USER_AGENT }, redirect: 'manual' },
        );

        expectHostedBounce(back, client.id, null);
        expect(back.headers.get('set-cookie')).toBeNull();
        // refused before the provider's single-use code is spent
        expect(providerTokenCalls).toEqual(tokenCallsBefore);
    });

    /**
     * The completion answers with a token pair on a cookie alone, and
     * `SameSite` is scoped to the registrable domain rather than the origin,
     * so a sibling subdomain would otherwise both send the cookie and be
     * allowed to read the response by the reflected-origin CORS default.
     */
    it('refuses a completion from another origin', async () => {
        await runFederatedLogin();

        const response = await httpRequest(
            suite,
            'POST',
            `identity-providers/${provider.id}/login-complete`,
            {
                headers: {
                    'user-agent': USER_AGENT,
                    origin: 'https://app.example.com',
                    cookie: `authup_federated_login=${pendingLoginCookie}`,
                },
            },
        );

        expect(response.status).toEqual(400);
    });

    it('refuses a completion from a browser that did not start the login', async () => {
        const hosted = await runFederatedLogin();

        const response = await completeRequest(hosted, null);
        expect(response.status).toEqual(400);
    });

    // The console carries its post-login destination in the callback URI's
    // own query. This leg re-serializes the whole code request into the
    // hosted authorize URL and back, so it has more places to mangle that
    // query than the direct login does.
    it('preserves a query on the redirect uri', async () => {
        const redirectUri = `${REDIRECT_URI}?redirect=%2Fusers`;
        const location = await completeFederatedLogin(
            buildCodeRequest({ redirect_uri: redirectUri }),
        );

        expect(`${location.origin}${location.pathname}`).toEqual(REDIRECT_URI);
        expect(location.searchParams.get('redirect')).toEqual('/users');
        expect(location.searchParams.get('state')).toEqual(STATE);

        // The code is bound to the redirect_uri including its query, so the
        // exchange only succeeds if the string survived byte-for-byte.
        const response = await exchange({
            code: location.searchParams.get('code') as string,
            client_id: client.id,
            redirect_uri: redirectUri,
            code_verifier: CODE_VERIFIER,
        });

        expect(response.status).toEqual(200);
    });

    it('mints a code the public client redeems with its PKCE verifier', async () => {
        const location = await completeFederatedLogin();

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
        const location = await completeFederatedLogin();

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
        const location = await completeFederatedLogin();

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
        const anonymousCode = (await completeFederatedLogin()).searchParams.get('code') as string;

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
            code: (await completeFederatedLogin()).searchParams.get('code') as string,
            client_id: other.id,
            client_secret: secret,
            redirect_uri: REDIRECT_URI,
            code_verifier: CODE_VERIFIER,
        });
        expect(foreign.status).toEqual(400);
        await expect(foreign.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.INVALID_GRANT });
    });

    it('lets the code be redeemed once only', async () => {
        const location = await completeFederatedLogin();
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

    it('records the login in the audit log', async () => {
        const hosted = await runFederatedLogin();
        await completePendingLogin(hosted);

        // The authorization itself is recorded by the hosted ladder now, like
        // any interactive one. What is unique to this leg is the login, and it
        // names the session the callback established so the trail can be
        // followed from it.
        const { data: events } = await suite.client.event.getMany({
            filters: { name: EventName.LOGIN },
            sort: { createdAt: 'DESC' },
            pagination: { limit: 5 },
        });

        const event = events.find((row) => (row.data as Record<string, any>)?.reason === 'federated');
        expect(event).toBeDefined();
        expect(event).toMatchObject({
            scope: EventScope.OAUTH2,
            name: EventName.LOGIN,
            refType: EventRefType.SESSION,
            actorType: IdentityType.USER,
        });
        expect((event as { sessionId?: string }).sessionId).toBeTruthy();
        expect(event?.data).toMatchObject({
            reason: 'federated',
            providerId: provider.id,
        });
    });

    it('returns the person to the login page when the provider answers with an error', async () => {
        const out = await httpRequest(suite, 'GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${buildCodeRequest()}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });
        const state = new URL(out.headers.get('location') as string).searchParams.get('state');
        const nonce = readPendingLoginCookie(out);
        const tokenCallsBefore = providerTokenCalls;

        // RFC 6749 section 4.1.2.1: the person cancelled at the provider.
        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&error=access_denied&error_description=${encodeURIComponent('<b>denied</b>')}`,
            {
                headers: { 'user-agent': USER_AGENT, cookie: `authup_federated_login=${nonce}` },
                redirect: 'manual',
            },
        );

        // no marker: back on the login page, and nothing of the answer echoed
        expectHostedBounce(back, client.id, null);
        expect(back.headers.get('location')).not.toContain('denied');
        expect(providerTokenCalls).toEqual(tokenCallsBefore);
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
        const nonce = readPendingLoginCookie(out);

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
                headers: { 'user-agent': USER_AGENT, cookie: `authup_federated_login=${nonce}` },
                redirect: 'manual',
            },
        );

        expectHostedBounce(back, client.id, OAuth2ErrorCode.LOGIN_REQUIRED);
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
            const nonce = readPendingLoginCookie(out);

            // A federated login must not be the way around the deactivation the
            // local login path enforces.
            const back = await httpRequest(
                suite,
                'GET',
                `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
                {
                    headers: { 'user-agent': USER_AGENT, cookie: `authup_federated_login=${nonce}` },
                    redirect: 'manual',
                },
            );

            expectHostedBounce(back, client.id, OAuth2ErrorCode.ACCESS_DENIED);
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
        const nonce = readPendingLoginCookie(out);

        // The redirect below is only safe because the verifier throws on a
        // pattern mismatch. Nothing else on the callback path re-checks it, so
        // this is the test that stops that throw being refactored away.
        await suite.client.client.update(moved.id, { redirectUri: 'https://elsewhere.example.org/**' });

        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
            {
                headers: { 'user-agent': USER_AGENT, cookie: `authup_federated_login=${nonce}` },
                redirect: 'manual',
            },
        );

        // No marker: the hosted page re-runs the verifier on the same request
        // and renders the mismatch itself.
        expectHostedBounce(back, moved.id, null);
    });

    it('refuses the code to a redirect_uri other than the one it was bound to', async () => {
        const location = await completeFederatedLogin();

        const response = await exchange({
            code: location.searchParams.get('code') as string,
            client_id: client.id,
            redirect_uri: 'https://example.com/elsewhere',
            code_verifier: CODE_VERIFIER,
        });

        expect(response.status).toEqual(400);
        await expect(response.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.INVALID_GRANT });
    });

    it('delivers a custom-scheme redirect_uri through the hosted page', async () => {
        // A native app (RFC 8252). The callback bounces to the hosted page
        // like every other login, so the custom-scheme target is navigated at
        // the end of the ladder, the same place an interactive login
        // navigates it, and no interstitial of its own (plan 094).
        const native = (await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            redirectUri: 'myapp://cb',
        }))).data;
        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: native.id });

        const codeRequest = buildCodeRequest({
            client_id: native.id,
            redirect_uri: 'myapp://cb',
            scope: ScopeName.GLOBAL,
        });

        const hosted = await runFederatedLogin(codeRequest);
        expect(hosted.pathname.endsWith('/authorize')).toBe(true);
        expect(pendingLoginCookie).toBeTruthy();

        const target = await completeFederatedLogin(codeRequest);
        expect(target.protocol).toEqual('myapp:');
        expect(target.host).toEqual('cb');
        expect(target.searchParams.get('code')).toBeTruthy();
        expect(target.searchParams.get('state')).toEqual(STATE);
    });

    it('never completes a login for a script-capable redirect_uri', async () => {
        // The client validator and the code-request verifier both refuse such
        // a scheme, so the branch is unreachable over HTTP. The verifier the
        // controller holds is patched to let one through, which is the gap
        // the guard exists for: a target the hosted page would navigate and
        // render as an href must fail closed before a session exists.
        const native = (await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            redirectUri: 'myapp://cb',
        }))).data;
        const { data: scope } = await suite.client.scope.getOne(ScopeName.GLOBAL);
        await suite.client.clientScope.create({ scopeId: scope.id, clientId: native.id });

        const out = await httpRequest(suite, 'GET', `identity-providers/${provider.id}/authorize-out?codeRequest=${buildCodeRequest({
            client_id: native.id,
            redirect_uri: 'myapp://cb',
            scope: ScopeName.GLOBAL,
        })}`, {
            headers: { 'user-agent': USER_AGENT },
            redirect: 'manual',
        });
        const state = new URL(out.headers.get('location') as string).searchParams.get('state');
        const nonce = readPendingLoginCookie(out);

        const tokenCallsBefore = providerTokenCalls;
        const verifier = suite.container.resolve(OAuth2InjectionToken.AuthorizationCodeRequestVerifier);
        const verify = verifier.verify.bind(verifier);
        const spy = vi.spyOn(verifier, 'verify').mockImplementation(async (data) => {
            const result = await verify(data);
            // eslint-disable-next-line no-script-url -- the scheme under test
            result.data.redirect_uri = 'javascript:alert(document.cookie)//';
            return result;
        });

        try {
            const back = await httpRequest(
                suite,
                'GET',
                `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
                {
                    headers: { 'user-agent': USER_AGENT, cookie: `authup_federated_login=${nonce}` },
                    redirect: 'manual',
                },
            );

            expect(spy).toHaveBeenCalled();
            expect(back.status).toBeGreaterThanOrEqual(400);
            expect(back.headers.get('location')).toBeNull();
            expect(back.headers.get('content-type')).not.toContain('text/html');
            expect(await back.text()).not.toContain('alert(document.cookie)');
            // refused before the provider's code was spent
            expect(providerTokenCalls).toEqual(tokenCallsBefore);
        } finally {
            spy.mockRestore();
        }
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
        const nonce = readPendingLoginCookie(out);

        // The client is verified again at completion, so a deactivation that
        // lands while the user is at the provider still takes effect.
        await suite.client.client.update(disabled.id, { active: false });

        providerTokenCalls = 0;

        const back = await httpRequest(
            suite,
            'GET',
            `identity-providers/${provider.id}/authorize-in?state=${state}&code=external-code`,
            {
                headers: { 'user-agent': USER_AGENT, cookie: `authup_federated_login=${nonce}` },
                redirect: 'manual',
            },
        );

        // An inactive client is refused, and crucially the browser is not
        // redirected anywhere carrying a code.
        expectHostedBounce(back, disabled.id, null);

        // The refusal happens before the provider is contacted, so a doomed
        // completion spends neither the provider's single-use code nor a local
        // user row. This is what pins the verify-then-authenticate order.
        expect(providerTokenCalls).toEqual(0);
    });

    /**
     * The local second factor belongs to a local credential. An external
     * provider authenticated this login and is where MFA is enforced for it,
     * so authup stacks nothing on top. The password grant for the SAME user
     * still demands the factor, which is the half of the rule that would
     * break first if someone widened the skip.
     */
    it('does not challenge a local factor for a federated login', async () => {
        // Provision the external user through a first login, then give it a
        // confirmed factor. An email authenticator is the only kind an admin
        // may enroll for someone else, and it is confirmed on create.
        await runFederatedLogin();

        const { data: users } = await suite.client.user.getMany({ filters: { realmId: realm.id } });
        const user = users.find((row) => row.name !== 'admin');
        expect(user).toBeDefined();

        const { data: authenticator } = await suite.client.userAuthenticator.enroll(
            (user as { id: string }).id,
            { kind: UserAuthenticatorKind.EMAIL },
        );

        try {
            const location = await completeFederatedLogin();

            expect(`${location.origin}${location.pathname}`).toEqual(REDIRECT_URI);
            expect(location.searchParams.get('code')).toBeTruthy();
        } finally {
            await suite.client.userAuthenticator.delete((user as { id: string }).id, authenticator.id);
        }
    });

    it('tells the page a federated session owes nothing, and owes a factor when asked', async () => {
        await runFederatedLogin();

        const { data: users } = await suite.client.user.getMany({ filters: { realmId: realm.id } });
        const user = users.find((row) => row.name !== 'admin');

        const { data: authenticator } = await suite.client.userAuthenticator.enroll(
            (user as { id: string }).id,
            { kind: UserAuthenticatorKind.EMAIL },
        );

        try {
            const hosted = await runFederatedLogin();
            const accessToken = await completePendingLogin(hosted);

            // the page renders from this answer, so it has to say what the
            // SESSION owes rather than what the user holds
            const plain = await httpRequest(suite, 'GET', 'authenticators/challenge', { headers: { authorization: `Bearer ${accessToken}` } });
            await expect(plain.json()).resolves.toMatchObject({
                required: false,
                enrollmentRequired: false,
            });

            // an application that asked for a proof is the exception, and it
            // can only ADD the requirement
            const stepUp = await httpRequest(
                suite,
                'GET',
                'authenticators/challenge?acrValues=urn%3Aauthup%3Amfa',
                { headers: { authorization: `Bearer ${accessToken}` } },
            );
            await expect(stepUp.json()).resolves.toMatchObject({ required: true });
        } finally {
            await suite.client.userAuthenticator.delete((user as { id: string }).id, authenticator.id);
        }
    });

    it('still steps up when the application asks for MFA explicitly', async () => {
        await runFederatedLogin();

        const { data: users } = await suite.client.user.getMany({ filters: { realmId: realm.id } });
        const user = users.find((row) => row.name !== 'admin');

        const { data: authenticator } = await suite.client.userAuthenticator.enroll(
            (user as { id: string }).id,
            { kind: UserAuthenticatorKind.EMAIL },
        );

        try {
            const codeRequest = buildCodeRequest({ acr_values: 'urn:authup:mfa' });
            const hosted = await runFederatedLogin(codeRequest);
            const accessToken = await completePendingLogin(hosted);

            const approve = await httpRequest(suite, 'POST', 'authorize', {
                headers: {
                    authorization: `Bearer ${accessToken}`,
                    'content-type': 'application/json',
                    'user-agent': USER_AGENT,
                },
                body: Buffer.from(codeRequest, 'base64url').toString('utf-8'),
            });

            // the application asked, and a local factor is the only way authup
            // can answer it
            expect(approve.status).toEqual(400);
            await expect(approve.json()).resolves.toMatchObject({ error: OAuth2ErrorCode.MFA_REQUIRED });
        } finally {
            await suite.client.userAuthenticator.delete((user as { id: string }).id, authenticator.id);
        }
    });
});
