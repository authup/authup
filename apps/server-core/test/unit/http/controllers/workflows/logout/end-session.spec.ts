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
import type { Client, Realm } from '@authup/core-kit';
import { ScopeName } from '@authup/core-kit';
import { Client as HTTPClient } from '@authup/core-http-kit';
import {
    OAuth2AuthorizationCodeChallengeMethod,
    OAuth2AuthorizationResponseType,
} from '@authup/specs';
import { buildOAuth2CodeChallenge, generateOAuth2CodeVerifier } from '../../../../../../src/core';
import {
    createFakeClient,
    createFakeRealm,
    createFakeUser,
    httpRequest,
} from '../../../../../utils';
import { createTestApplication } from '../../../../../app';

const REDIRECT_PATTERN = 'https://app.example.com/**';
const REDIRECT_URI = 'https://app.example.com/cb';
const POST_LOGOUT_URI = 'https://app.example.com/loggedout';

describe('end-session (/logout)', () => {
    const suite = createTestApplication();

    let realm : Realm;
    let client : Client;

    beforeAll(async () => {
        await suite.setup();

        realm = (await suite.client.realm.create(createFakeRealm())).data;
        client = (await suite.client.client.create(createFakeClient({
            realmId: realm.id,
            authMethod: 'none',
            tokenBindingMethod: 'none',
            secret: null,
            redirectUri: REDIRECT_PATTERN,
            postLogoutRedirectUri: REDIRECT_PATTERN,
        }))).data;

        for (const scopeName of [ScopeName.GLOBAL, ScopeName.OPEN_ID]) {
            const { data: scope } = await suite.client.scope.getOne(scopeName);
            await suite.client.clientScope.create({ scopeId: scope.id, clientId: client.id });
        }
    });

    afterAll(async () => {
        await suite.teardown();
    });

    // Log in a fresh realm user, run the interactive authorize → exchange, and
    // return the token set (the id_token carries sub + sid; the refresh_token
    // belongs to the same session, so it is our "is the session alive?" probe).
    const mintTokens = async () => {
        const password = generateOAuth2CodeVerifier();
        const { data: user } = await suite.client.user.create(createFakeUser({ realmId: realm.id, password }));

        const login = await suite.client.token.createWithPassword({
            username: user.name,
            password,
            realm_id: realm.id,
        });

        const userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const codeVerifier = generateOAuth2CodeVerifier();
        const codeChallenge = await buildOAuth2CodeChallenge(codeVerifier);
        const authorized = await userClient.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: client.id,
            redirect_uri: REDIRECT_URI,
            scope: `${ScopeName.GLOBAL} ${ScopeName.OPEN_ID}`,
            code_challenge: codeChallenge,
            code_challenge_method: OAuth2AuthorizationCodeChallengeMethod.SHA_256,
            state: generateOAuth2CodeVerifier(),
        });

        const code = new URL(authorized.url).searchParams.get('code')!;
        return suite.client.token.createWithAuthorizationCode({
            client_id: client.name,
            redirect_uri: REDIRECT_URI,
            code,
            code_verifier: codeVerifier,
            realm_id: realm.id,
        });
    };

    const refreshSucceeds = async (refreshToken: string): Promise<boolean> => {
        try {
            await suite.client.token.createWithRefreshToken({
                refresh_token: refreshToken,
                client_id: client.name,
                realm_id: realm.id,
            });
            return true;
        } catch {
            return false;
        }
    };

    /**
     * The end-session work moved to a JSON call the rendered page makes
     * (plan 101 D2). The browser bindings stay where OIDC put them and
     * hand over to the console service, so the matrix below drives the
     * POST, and the two forwarding cases are pinned separately.
     */
    const endSession = async (params: Record<string, string>) => {
        const response = await httpRequest(suite, 'POST', '/logout', {
            body: JSON.stringify(params),
            headers: { 'Content-Type': 'application/json' },
        });

        expect(response.status).toEqual(200);
        // a per-request answer about a session, never from a cache
        expect(response.headers.get('cache-control')).toEqual('no-store');

        return response.json();
    };

    it('should revoke the session referenced by a verified id_token_hint', async () => {
        // NOTE: refresh tokens rotate (plan 016) — each refresh_token is
        // consumed by a single refreshSucceeds() call, so never probe the same
        // token twice.
        const revoked = await mintTokens();
        const survivor = await mintTokens();
        expect(revoked.id_token).toBeDefined();

        const body = await endSession({ id_token_hint: revoked.id_token! });
        expect(body.serverRevoked).toBe(true);
        expect(body.hintVerified).toBe(true);
        // the operands of the page's auto-clear gate
        expect(body.hintSub).toBeTruthy();
        expect(body.hintSubKind).toEqual('user');

        // the referenced session (and its refresh token) is gone
        expect(await refreshSucceeds(revoked.refresh_token!)).toBe(false);
        // an unrelated session is untouched
        expect(await refreshSucceeds(survivor.refresh_token!)).toBe(true);
    });

    it('should answer the validated redirect after revoking with a verified hint', async () => {
        const tokens = await mintTokens();
        const state = generateOAuth2CodeVerifier();

        const body = await endSession({
            id_token_hint: tokens.id_token!,
            post_logout_redirect_uri: POST_LOGOUT_URI,
            state,
        });

        expect(body.serverRevoked).toBe(true);
        expect(body.redirect.startsWith(POST_LOGOUT_URI)).toBe(true);
        expect(new URL(body.redirect).searchParams.get('state')).toEqual(state);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(false);
    });

    it('should still revoke with a valid hint when a cosmetic param is malformed', async () => {
        const tokens = await mintTokens();

        const body = await endSession({
            id_token_hint: tokens.id_token!,
            post_logout_redirect_uri: 'not-a-url',
        });

        expect(body.serverRevoked).toBe(true);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(false);
    });

    it('should still revoke with a valid hint when the realm hint is oversized (hint-only retry)', async () => {
        const tokens = await mintTokens();

        const body = await endSession({
            id_token_hint: tokens.id_token!,
            realm_name: 'x'.repeat(5000),
        });

        expect(body.serverRevoked).toBe(true);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(false);
    });

    it('should still revoke with a valid hint when state is oversized (cosmetic-param decoupling)', async () => {
        const tokens = await mintTokens();

        const body = await endSession({
            id_token_hint: tokens.id_token!,
            state: 'x'.repeat(5000),
        });

        expect(body.serverRevoked).toBe(true);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(false);
    });

    it('should auto-revoke with a name-identified client_id (resolved via the verified hint realm, plan 047.B)', async () => {
        const tokens = await mintTokens();

        const body = await endSession({
            id_token_hint: tokens.id_token!,
            client_id: client.name,
        });

        expect(body.serverRevoked).toBe(true);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(false);
    });

    it('should report a hint-less request as unrevoked (no silent no-op logout)', async () => {
        // The defect this pins: a hint-less request with a validated
        // post_logout_redirect_uri must never read as a completed logout.
        // The server bounced straight back to the RP before; now it answers
        // serverRevoked=false, and the page navigates only after a human has
        // clicked and its own sign-out has run.
        const body = await endSession({
            client_id: client.id,
            post_logout_redirect_uri: POST_LOGOUT_URI,
        });

        expect(body.serverRevoked).toBe(false);
        expect(body.hintVerified).toBeFalsy();
        expect(body.hintSub).toBeUndefined();
    });

    it('should NOT revoke when an access token is presented as id_token_hint (kind check)', async () => {
        const tokens = await mintTokens();

        // access tokens also carry session_id — accepting one as a hint would let
        // a leaked access token force a logout. The kind check rejects it.
        const body = await endSession({ id_token_hint: tokens.access_token });

        expect(body.serverRevoked).toBe(false);
        expect(body.hintSub).toBeUndefined();
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(true);
    });

    it('should NOT revoke when the id_token_hint is forged / unverifiable', async () => {
        const tokens = await mintTokens();

        const body = await endSession({ id_token_hint: 'not.a.valid.jwt' });

        expect(body.serverRevoked).toBe(false);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(true);
    });

    it('should not answer an unregistered post_logout_redirect_uri', async () => {
        const tokens = await mintTokens();

        const body = await endSession({
            id_token_hint: tokens.id_token!,
            post_logout_redirect_uri: 'https://attacker.example.com/steal',
        });

        // the unmatched uri is dropped, so the page has nowhere to navigate
        expect(body.redirect).toBeUndefined();
        expect(body.serverRevoked).toBe(true);
    });

    it('should resolve a name-identified client through a mixed-case realm hint (ingress canonicalization)', async () => {
        const body = await endSession({
            client_id: client.name,
            realm_name: ` ${realm.name.toUpperCase()} `,
            post_logout_redirect_uri: POST_LOGOUT_URI,
        });

        // without the validator's trim().toLowerCase() the realm hint would fail
        // closed → no client resolution → no validated redirect
        expect(body.clientName).toEqual(client.name);
        expect(body.redirect).toEqual(POST_LOGOUT_URI);
    });

    it('should drop everything when the id_token_hint ITSELF is malformed (no revoke)', async () => {
        const tokens = await mintTokens();

        // an oversized id_token_hint (the revoke-critical field) fails BOTH
        // validation stages → parameter-less answer, nothing revoked.
        // (A malformed *cosmetic* param, by contrast, keeps the revoke — see
        // the "should still revoke … when a cosmetic param is malformed" test.)
        const body = await endSession({ id_token_hint: `${tokens.id_token}${'x'.repeat(5000)}` });

        expect(body.serverRevoked).toBe(false);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(true);
    });

    it('should forward the GET binding to the auth console, carrying the request', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            `/logout?client_id=${client.id}&post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_URI)}`,
            { redirect: 'manual' },
        );

        expect(response.status).toBeGreaterThanOrEqual(300);
        expect(response.status).toBeLessThan(400);
        // the hop reflects request parameters, so it must never be cached
        expect(response.headers.get('cache-control')).toEqual('no-store');

        const location = new URL(response.headers.get('location') ?? '');
        expect(location.pathname.endsWith('/logout')).toBe(true);
        expect(location.searchParams.get('client_id')).toEqual(client.id);
        expect(location.searchParams.get('post_logout_redirect_uri')).toEqual(POST_LOGOUT_URI);
    });

    it('should forward the form_post binding too, and revoke nothing on the way', async () => {
        // OIDC RP-Initiated Logout allows form_post on this endpoint, and it
        // is a NAVIGATION like the GET. Only a JSON body means the console
        // page is asking for the session to be ended.
        const tokens = await mintTokens();

        const response = await httpRequest(suite, 'POST', '/logout', {
            form: { id_token_hint: tokens.id_token! },
            redirect: 'manual',
        });

        expect(response.status).toBeGreaterThanOrEqual(300);
        expect(response.status).toBeLessThan(400);

        // a 302 turns the POST into a GET, so the body has to survive as query
        const location = new URL(response.headers.get('location') ?? '');
        expect(location.searchParams.get('id_token_hint')).toEqual(tokens.id_token);

        // the hop itself decides nothing
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(true);
    });
});
