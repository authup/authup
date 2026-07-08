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

    it('should revoke the session referenced by a verified id_token_hint', async () => {
        // NOTE: refresh tokens rotate (plan 016) — each refresh_token is
        // consumed by a single refreshSucceeds() call, so never probe the same
        // token twice.
        const revoked = await mintTokens();
        const survivor = await mintTokens();
        expect(revoked.id_token).toBeDefined();

        const response = await httpRequest(suite, 'GET', `/logout?id_token_hint=${revoked.id_token}`);
        expect(response.status).toEqual(200);

        // the referenced session (and its refresh token) is gone
        expect(await refreshSucceeds(revoked.refresh_token!)).toBe(false);
        // an unrelated session is untouched
        expect(await refreshSucceeds(survivor.refresh_token!)).toBe(true);
    });

    it('should redirect back to the RP after revoking with a verified hint + validated redirect', async () => {
        const tokens = await mintTokens();
        const state = generateOAuth2CodeVerifier();

        const response = await httpRequest(
            suite,
            'GET',
            `/logout?id_token_hint=${tokens.id_token}` +
                `&post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_URI)}&state=${state}`,
            { redirect: 'manual' },
        );

        expect(response.status).toBeGreaterThanOrEqual(300);
        expect(response.status).toBeLessThan(400);
        const location = response.headers.get('location') ?? '';
        expect(location.startsWith(POST_LOGOUT_URI)).toBe(true);
        // compare the decoded query value (state may contain URL-escaped chars)
        expect(new URL(location).searchParams.get('state')).toEqual(state);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(false);
    });

    it('should still revoke with a valid hint when a cosmetic param is malformed', async () => {
        // a malformed post_logout_redirect_uri (relative → fails the URL check)
        // must NOT discard the valid id_token_hint and skip the revoke — the
        // security-critical revoke is decoupled from cosmetic-param validity.
        const tokens = await mintTokens();

        const response = await httpRequest(
            suite,
            'GET',
            `/logout?id_token_hint=${tokens.id_token}&post_logout_redirect_uri=${encodeURIComponent('/not-an-absolute-url')}`,
            { redirect: 'manual' },
        );

        // the bad redirect is dropped (no 302), but the session IS revoked
        expect(response.status).toEqual(200);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(false);
    });

    it('should still revoke with a valid hint when state is oversized (cosmetic-param decoupling)', async () => {
        // the pre-fix behavior: an oversized state failed validation and the
        // WHOLE request degraded to parameter-less — the valid hint was
        // discarded and the revoke silently skipped.
        const tokens = await mintTokens();

        const response = await httpRequest(
            suite,
            'GET',
            `/logout?id_token_hint=${tokens.id_token}&state=${'x'.repeat(3000)}`,
            { redirect: 'manual' },
        );

        expect(response.status).toEqual(200);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(false);
    });

    it('should auto-revoke with a name-identified client_id (resolved via the verified hint realm, plan 047.B)', async () => {
        // a name-form client_id is resolved to its client UUID — scoped by the
        // VERIFIED hint's own realm claim when the request carries no realm
        // hint — and the resolved UUID satisfies the aud cross-check.
        const tokens = await mintTokens();

        const response = await httpRequest(
            suite,
            'GET',
            `/logout?id_token_hint=${tokens.id_token}&client_id=${client.name}`,
            { redirect: 'manual' },
        );

        expect(response.status).toEqual(200);
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(false);
    });

    it('should NOT redirect a hint-less request — it renders the confirm page instead (no silent no-op logout)', async () => {
        // The defect this pins: a hint-less request with a validated
        // post_logout_redirect_uri used to 302 straight back to the RP without
        // revoking anything, so the RP treated a no-op as a successful logout.
        const response = await httpRequest(
            suite,
            'GET',
            `/logout?client_id=${client.id}&post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_URI)}`,
            { redirect: 'manual' },
        );

        expect(response.status).toEqual(200);
        const contentType = response.headers.get('content-type') ?? '';
        expect(contentType).toContain('text/html');
    });

    it('should NOT revoke when an access token is presented as id_token_hint (kind check)', async () => {
        const tokens = await mintTokens();

        // access tokens also carry session_id — accepting one as a hint would let
        // a leaked access token force a logout. The kind check rejects it.
        const response = await httpRequest(suite, 'GET', `/logout?id_token_hint=${tokens.access_token}`);
        expect(response.status).toEqual(200);

        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(true);
    });

    it('should NOT revoke when the id_token_hint is forged / unverifiable', async () => {
        const tokens = await mintTokens();

        const response = await httpRequest(suite, 'GET', '/logout?id_token_hint=not.a.valid.jwt');
        expect(response.status).toEqual(200);

        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(true);
    });

    it('should not redirect to an unregistered post_logout_redirect_uri', async () => {
        const tokens = await mintTokens();

        const response = await httpRequest(
            suite,
            'GET',
            `/logout?id_token_hint=${tokens.id_token}` +
                `&post_logout_redirect_uri=${encodeURIComponent('https://attacker.example.com/steal')}`,
            { redirect: 'manual' },
        );

        // unmatched redirect is dropped → the confirm page renders (200), not a
        // 302 to the attacker origin
        expect(response.status).toEqual(200);
    });

    it('should set the hardening headers on the confirm page', async () => {
        const response = await httpRequest(suite, 'GET', '/logout');

        expect(response.status).toEqual(200);
        expect(response.headers.get('referrer-policy')).toEqual('no-referrer');
        expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
        expect(response.headers.get('x-frame-options')).toEqual('DENY');
    });

    it('should resolve a name-identified client through a mixed-case realm hint (ingress canonicalization)', async () => {
        const response = await httpRequest(
            suite,
            'GET',
            `/logout?client_id=${client.name}` +
                `&realm_name=${encodeURIComponent(` ${realm.name.toUpperCase()} `)}` +
                `&post_logout_redirect_uri=${encodeURIComponent(POST_LOGOUT_URI)}`,
        );

        expect(response.status).toEqual(200);

        // without the validator's trim().toLowerCase() the realm hint would fail
        // closed → no client resolution → no validated redirect in the payload
        const match = (await response.text()).match(/window\.__AUTHUP__ = (.+);/);
        expect(match).toBeTruthy();
        const payload = JSON.parse(match![1]);
        expect(payload.data.client?.name).toEqual(client.name);
        expect(payload.data.redirect).toEqual(POST_LOGOUT_URI);
    });

    it('should drop everything when the id_token_hint ITSELF is malformed (no revoke, confirm page renders)', async () => {
        const tokens = await mintTokens();

        // an oversized id_token_hint (the revoke-critical field) fails BOTH
        // validation stages → parameter-less confirm page, nothing revoked.
        // (A malformed *cosmetic* param, by contrast, keeps the revoke — see
        // the "should still revoke … when a cosmetic param is malformed" test.)
        const response = await httpRequest(
            suite,
            'GET',
            `/logout?id_token_hint=${tokens.id_token}${'x'.repeat(5000)}`,
            { redirect: 'manual' },
        );

        expect(response.status).toEqual(200);
        expect(response.headers.get('content-type') ?? '').toContain('text/html');
        expect(await refreshSucceeds(tokens.refresh_token!)).toBe(true);
    });

    it('should reach the discovery-advertised end_session_endpoint', async () => {
        const config = await httpRequest(suite, 'GET', `/realms/${realm.name}/.well-known/openid-configuration`);
        const body: { end_session_endpoint?: string } = await config.json();
        expect(body.end_session_endpoint).toBeDefined();
        expect(body.end_session_endpoint!.endsWith('/logout')).toBe(true);
    });
});
