/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client as HTTPClient } from '@authup/core-http-kit';
import { CLIENT_ACCOUNT_CONSOLE_NAME } from '@authup/core-kit';
import { OAuth2AuthorizationResponseType } from '@authup/specs';
import {
    afterAll,
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import { ConfigInjectionKey } from '../../../../../../src/app';
import {
    CONSOLE_LOGIN_COOKIE,
    CONSOLE_SESSION_COOKIE,
} from '../../../../../../src/core';
import { createTestApplication } from '../../../../../app';
import { TestCookieJar, createFakeUser, httpRequest } from '../../../../../utils';

/**
 * The console session credential end to end (plan 088): the server-side kick,
 * the server-side redemption and the endpoints the console hydrates from.
 *
 * It runs through a real cookie jar rather than echoing `set-cookie` back by
 * hand, so a wrongly scoped cookie fails here instead of in a browser.
 */
describe('account console session', () => {
    const suite = createTestApplication();

    const jar = new TestCookieJar();

    let publicOrigin : string;

    function request(
        method: string,
        path: string,
        options: Record<string, any> = {},
    ) : Promise<Response> {
        const cookie = jar.header(path);

        return httpRequest(suite, method, path, {
            ...options,
            headers: {
                ...(options.headers ?? {}),
                ...(cookie ? { cookie } : {}),
            },
        }).then((response) => {
            jar.store(response);

            return response;
        });
    }

    beforeAll(async () => {
        await suite.setup();

        publicOrigin = new URL(suite.container.resolve(ConfigInjectionKey).publicUrl).origin;
    });

    afterAll(async () => {
        await suite.teardown();
    });

    it('signs a user in and out through the opaque session credential', async () => {
        const password = 'console-session-round-trip';
        const { data: user } = await suite.client.user.create(createFakeUser({ password }));
        const { data: realm } = await suite.client.realm.getOne('master');

        // 1) the kick: PKCE + state are minted server-side and parked behind
        //    a short-lived login cookie.
        const kick = await request('GET', `/account/login?realmId=${realm.id}`, { redirect: 'manual' });
        expect(kick.status).toEqual(302);
        expect(jar.get(CONSOLE_LOGIN_COOKIE)).toBeDefined();

        const authorizeURL = new URL(kick.headers.get('location') as string);
        expect(authorizeURL.pathname).toEqual('/authorize');
        expect(authorizeURL.searchParams.get('client_id')).toEqual(CLIENT_ACCOUNT_CONSOLE_NAME);
        expect(authorizeURL.searchParams.get('realm_id')).toEqual(realm.id);
        expect(authorizeURL.searchParams.get('code_challenge_method')).toEqual('S256');
        expect(authorizeURL.searchParams.get('redirect_uri')).toEqual(`${publicOrigin}/account/callback`);

        const state = authorizeURL.searchParams.get('state') as string;

        // 2) the hosted login page: the visitor authenticates and the consent
        //    POST issues the code (auto-consent, the console client is built in).
        const login = await suite.client
            .token
            .createWithPassword({ username: user.name, password });

        const userClient = new HTTPClient({ baseURL: suite.baseURL });
        userClient.setAuthorizationHeader({ type: 'Bearer', token: login.access_token });

        const authorized = await userClient.authorize.confirm({
            response_type: OAuth2AuthorizationResponseType.CODE,
            client_id: CLIENT_ACCOUNT_CONSOLE_NAME,
            realm_id: realm.id,
            redirect_uri: authorizeURL.searchParams.get('redirect_uri') as string,
            scope: authorizeURL.searchParams.get('scope') as string,
            state,
            code_challenge: authorizeURL.searchParams.get('code_challenge') as string,
            code_challenge_method: authorizeURL.searchParams.get('code_challenge_method') as string,
        });

        const code = new URL(authorized.url).searchParams.get('code') as string;
        expect(code).toBeDefined();

        // 3) the redemption. Nothing token-shaped reaches the browser: the
        //    pair is exchanged, verified and revoked inside the request.
        const callback = await request('GET', `/account/callback?code=${code}&state=${state}`, {
            redirect: 'manual',
            headers: { 'sec-fetch-site': 'same-origin' },
        });

        expect(callback.status).toEqual(302);
        expect(callback.headers.get('location')).toEqual('/account');

        // The response carries TWO set-cookie headers (the spent login cookie
        // is cleared alongside), so the flags are read off the session
        // cookie's OWN header: `headers.get('set-cookie')` joins them, and a
        // `toContain` over the joined string would be satisfied by either.
        const setCookie = callback.headers
            .getSetCookie()
            .find((value) => value.startsWith(`${CONSOLE_SESSION_COOKIE}=`)) as string;
        expect(setCookie).toBeDefined();
        expect(setCookie).toContain('HttpOnly');
        expect(setCookie).toContain('SameSite=Strict');
        expect(setCookie).toContain('Path=/');

        // Max-Age is SECONDS while the session's remaining lifetime is
        // milliseconds, so the bound is the assertion: taken literally the
        // cookie would outlive its session by three orders of magnitude (an
        // ~8-year cookie for a ~3-day session), which a `Max-Age=\d+` match
        // would happily accept.
        const maxAge = Number((/Max-Age=(\d+)/.exec(setCookie) as RegExpExecArray)[1]);
        expect(maxAge).toBeGreaterThan(0);
        expect(maxAge).toBeLessThanOrEqual(30 * 24 * 60 * 60);

        const secret = setCookie.split(';')[0].slice(`${CONSOLE_SESSION_COOKIE}=`.length);
        expect(secret.length).toBeGreaterThan(0);
        expect(jar.get(CONSOLE_SESSION_COOKIE)).toEqual(secret);
        // single use: the pending login is spent and its cookie cleared
        expect(jar.get(CONSOLE_LOGIN_COOKIE)).toBeUndefined();

        // 4) the console hydrates from the session endpoint
        const sessionResponse = await request('GET', '/account/session', { headers: { 'sec-fetch-site': 'same-origin' } });
        expect(sessionResponse.status).toEqual(200);
        expect(sessionResponse.headers.get('cache-control')).toEqual('no-store');
        expect(sessionResponse.headers.get('vary')).toEqual('cookie');

        const sessionBody = await sessionResponse.json();
        expect(sessionBody.active).toEqual(true);
        expect(sessionBody.sub).toEqual(user.id);
        expect(sessionBody.session_id).toBeDefined();
        expect(sessionBody.realm_id).toEqual(realm.id);

        // 5) and the credential drives ordinary, identity-gated API routes —
        //    the same ones every other client reaches with a bearer.
        const me = await request('GET', '/users/@me', { headers: { 'sec-fetch-site': 'same-origin' } });
        expect(me.status).toEqual(200);
        expect((await me.json()).data.id).toEqual(user.id);

        const sessions = await request('GET', '/sessions', { headers: { 'sec-fetch-site': 'same-origin' } });
        expect(sessions.status).toEqual(200);

        // the control: it is the cookie doing that work, not an ambient
        // anonymous allowance on the route.
        const anonymous = await httpRequest(suite, 'GET', '/users/@me', { headers: { 'sec-fetch-site': 'same-origin' } });
        expect(anonymous.status).toEqual(401);

        // 6) but never the OAuth2 issuance surface (plan 088, finding 2)
        const issuance = await request('POST', '/authorize', {
            headers: {
                'sec-fetch-site': 'same-origin',
                origin: publicOrigin,
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                response_type: OAuth2AuthorizationResponseType.CODE,
                client_id: CLIENT_ACCOUNT_CONSOLE_NAME,
                realm_id: realm.id,
                redirect_uri: `${publicOrigin}/account/callback`,
            }),
        });
        expect(issuance.status).toEqual(401);

        // 7) sign out: the credential is dropped, the session revoked and the
        //    cookie cleared.
        const signOut = await request('DELETE', '/account/session', {
            headers: {
                'sec-fetch-site': 'same-origin',
                origin: publicOrigin,
            },
        });
        expect(signOut.status).toEqual(200);
        expect(jar.get(CONSOLE_SESSION_COOKIE)).toBeUndefined();

        // The credential itself is dead, not merely forgotten by the browser:
        // the handle was dropped and the session revoked, so replaying the
        // exact value resolves nothing.
        const replayed = await httpRequest(suite, 'GET', '/account/session', {
            headers: {
                'sec-fetch-site': 'same-origin',
                cookie: `${CONSOLE_SESSION_COOKIE}=${secret}`,
            },
        });
        expect((await replayed.json()).active).toEqual(false);

        const replayedOnAPI = await httpRequest(suite, 'GET', '/users/@me', {
            headers: {
                'sec-fetch-site': 'same-origin',
                cookie: `${CONSOLE_SESSION_COOKIE}=${secret}`,
            },
        });
        expect(replayedOnAPI.status).toEqual(401);
    });

    it('refuses a callback that does not originate from this origin', async () => {
        const foreign = new TestCookieJar();

        const { data: realm } = await suite.client.realm.getOne('master');

        const kick = await httpRequest(suite, 'GET', `/account/login?realmId=${realm.id}`, { redirect: 'manual' });
        foreign.store(kick);

        const state = new URL(kick.headers.get('location') as string).searchParams.get('state') as string;

        const callback = await httpRequest(suite, 'GET', `/account/callback?code=whatever&state=${state}`, {
            redirect: 'manual',
            headers: {
                // what a sibling subdomain sends, never `same-origin`
                'sec-fetch-site': 'same-site',
                cookie: foreign.header('/account/callback') as string,
            },
        });

        expect(callback.status).toEqual(400);
    });

    it('refuses a callback whose state does not match, without spending the login', async () => {
        const { data: realm } = await suite.client.realm.getOne('master');

        const local = new TestCookieJar();
        const kick = await httpRequest(suite, 'GET', `/account/login?realmId=${realm.id}`, { redirect: 'manual' });
        local.store(kick);

        const mismatched = await httpRequest(suite, 'GET', '/account/callback?code=whatever&state=not-the-state', {
            redirect: 'manual',
            headers: {
                'sec-fetch-site': 'same-origin',
                cookie: local.header('/account/callback') as string,
            },
        });

        expect(mismatched.status).toEqual(302);
        expect(mismatched.headers.get('location')).toEqual('/account?error=invalid_request');

        // the pending login survived: a second tab's callback must not burn it
        const state = new URL(kick.headers.get('location') as string).searchParams.get('state') as string;
        const matched = await httpRequest(suite, 'GET', `/account/callback?code=whatever&state=${state}`, {
            redirect: 'manual',
            headers: {
                'sec-fetch-site': 'same-origin',
                cookie: local.header('/account/callback') as string,
            },
        });

        // consumed now, and refused for the bogus code rather than for a
        // missing pending login
        expect(matched.status).toEqual(302);
        expect(matched.headers.get('location')).toEqual('/account?error=invalid_grant');
    });
});
