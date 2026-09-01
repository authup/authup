/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { createPinia } from 'pinia';
import {
    afterEach,
    describe,
    expect,
    it,
} from 'vitest';
import { createApp, h } from 'vue';
import type { CookieOptions } from '../../../../src/types';
import { injectStore, installStore } from '../../../../src/core/store';

const GRANT_RESPONSE = {
    access_token: 'at-1',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'rt-1',
    id_token: 'idt-1',
};

const INTROSPECTION_RESPONSE = {
    active: true,
    exp: 9999999999,
    // the endpoint resolves the subject and answers with its OpenID claims —
    // the store builds `user` out of these
    sub: 'user-1',
    sub_kind: 'user',
    name: 'admin',
    session_id: 'sess-1',
    realm_id: 'realm-1',
    realm_name: 'master',
    permissions: [],
};

const USER_RESPONSE = { id: 'user-1', name: 'admin' };

type CookieSetCall = {
    key: string,
    value: unknown,
    options: CookieOptions
};

type CookieUnsetCall = {
    key: string,
    options: CookieOptions
};

function buildApp(seed: Record<string, unknown> = {}, cookiePath?: string) {
    const jar = new Map<string, unknown>(Object.entries(seed));
    const setCalls : CookieSetCall[] = [];
    const unsetCalls : CookieUnsetCall[] = [];

    const httpClient = createFakeClient({
        handlers: {
            'POST /token': () => ({ ...GRANT_RESPONSE }),
            'POST /token/introspect': () => ({ ...INTROSPECTION_RESPONSE }),
            'GET /userinfo': () => ({ ...USER_RESPONSE }),
            'POST /token/revoke': () => ({}),
        },
    });

    const pinia = createPinia();
    const app = createApp({ render: () => h('div') });
    app.use(pinia);

    installStore(app, {
        cookiePath,
        httpClient,
        pinia,
        cookieGet: (key) => jar.get(key),
        cookieSet: (key, value, options) => {
            setCalls.push({
                key, 
                value, 
                options, 
            });
            jar.set(key, value);
        },
        cookieUnset: (key, options) => {
            unsetCalls.push({ key, options });
            jar.delete(key);
        },
    });

    const store = injectStore(pinia, app);

    return {
        store, 
        httpClient, 
        setCalls, 
        unsetCalls,
    };
}

describe('core/store/install-cookies', () => {
    it('hydrates the store from cookies synchronously at install time', () => {
        const expireDate = '2099-01-01T00:00:00.000Z';
        const {
            store,
            setCalls,
            unsetCalls,
        } = buildApp({
            [CookieName.ACCESS_TOKEN]: 'cookie-at',
            [CookieName.ACCESS_TOKEN_EXPIRE_DATE]: expireDate,
            [CookieName.REFRESH_TOKEN]: 'cookie-rt',
            [CookieName.ID_TOKEN]: 'cookie-idt',
            [CookieName.USER]: { id: 'user-1', name: 'admin' },
            [CookieName.REALM]: { id: 'realm-1', name: 'master' },
            [CookieName.REALM_MANAGEMENT]: { id: 'realm-2', name: 'other' },
        });

        expect(store.cookiesRead).toBe(true);
        expect(store.accessToken).toEqual('cookie-at');
        expect(store.accessTokenExpireDate).toBeInstanceOf(Date);
        expect((store.accessTokenExpireDate as Date).getTime()).toEqual(new Date(expireDate).getTime());
        expect(store.refreshToken).toEqual('cookie-rt');
        expect(store.idToken).toEqual('cookie-idt');
        expect(store.realm).toMatchObject({ id: 'realm-1' });
        expect(store.realmManagement).toMatchObject({ id: 'realm-2' });

        // the user record is not hydrated from the jar anymore, and the copy an
        // earlier version left behind is swept at install
        expect(store.user).toBeNull();
        expect(unsetCalls).toContainEqual(
            expect.objectContaining({ key: CookieName.USER, options: { path: '/' } }),
        );

        // hydration flips loggedIn before any network validation ran
        expect(store.loggedIn).toBe(true);

        // hydration re-emits the *_UPDATED events — the cookie listeners echo
        // the restored values straight back into the jar
        expect(setCalls.some(
            (call) => call.key === CookieName.ACCESS_TOKEN && call.value === 'cookie-at',
        )).toBe(true);

        // the expire date hydrates BEFORE the access token, so the write-back
        // echo re-persists the token cookie with the derived maxAge — never as
        // a session cookie (enum order would drop the expiry)
        const accessTokenEcho = setCalls.find((call) => call.key === CookieName.ACCESS_TOKEN);
        expect(accessTokenEcho!.options.maxAge).toBeTypeOf('number');
        expect(accessTokenEcho!.options.maxAge!).toBeGreaterThan(0);
    });

    it('persists cookies on login — except the realm cookie (introspection bypasses setRealm) and the user record', async () => {
        const { store, setCalls } = buildApp();

        await store.login({ name: 'admin', password: 'start123' });

        const keys = setCalls.map((call) => call.key);
        expect(keys).toContain(CookieName.ACCESS_TOKEN);
        expect(keys).toContain(CookieName.ACCESS_TOKEN_EXPIRE_DATE);
        expect(keys).toContain(CookieName.REFRESH_TOKEN);
        expect(keys).toContain(CookieName.ID_TOKEN);
        expect(keys).toContain(CookieName.REALM_MANAGEMENT);

        // the user record never reaches the jar, but the store still holds it
        expect(keys).not.toContain(CookieName.USER);
        expect(store.user).toMatchObject({ id: 'user-1' });

        // realm.value is written directly during introspection — REALM_UPDATED
        // never fires, so the realm cookie is never persisted
        expect(keys).not.toContain(CookieName.REALM);
        expect(store.realm).toMatchObject({ id: 'realm-1' });

        // the access-token cookie rides the grant-derived expire date
        const accessTokenCall = setCalls.find((call) => call.key === CookieName.ACCESS_TOKEN);
        expect(accessTokenCall).toBeDefined();
        expect(accessTokenCall!.options.maxAge).toBeTypeOf('number');
        expect(accessTokenCall!.options.maxAge!).toBeGreaterThan(0);
        expect(accessTokenCall!.options.maxAge!).toBeLessThanOrEqual(3600);
    });

    it('unsets every cookie on logout', async () => {
        const {
            store, 
            setCalls, 
            unsetCalls, 
        } = buildApp();

        await store.login({ name: 'admin', password: 'start123' });
        setCalls.length = 0;
        unsetCalls.length = 0;

        await store.logout();

        expect(unsetCalls.map((call) => call.key)).toEqual([
            CookieName.ACCESS_TOKEN,
            CookieName.ACCESS_TOKEN_EXPIRE_DATE,
            CookieName.REFRESH_TOKEN,
            CookieName.ID_TOKEN,
            CookieName.REALM,
            CookieName.REALM_MANAGEMENT,
        ]);
        expect(setCalls).toHaveLength(0);
    });
});

describe('core/store/install-cookies path', () => {
    const setPathname = (pathname: string) => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { pathname },
        });
    };

    afterEach(() => {
        setPathname('/');
    });

    // Every install also sweeps the legacy `user` copy at the pinned path
    // (asserted in the suite above). The shadowing sweep never touches that
    // path, so it is dropped here to keep these cases about paths alone.
    const shadowingUnsets = <T extends { key: string, options: { path?: string } }>(calls: T[]) => calls
        .filter((call) => !(call.key === CookieName.USER && call.options.path === '/'));

    // A cookie stored without an explicit `Path` inherits the browser's
    // default-path, the directory of the writing document. The account
    // console at `/console/account` and the hosted auth pages at `/` are one origin
    // sharing one session under one set of cookie names, so the implicit
    // paths gave them two shadowing sets that expire independently: a `user`
    // from one login then pairs up with an `access_token` from another and
    // the store renders an identity that is not the token's subject.
    it('writes and clears every cookie at the default root path', async () => {
        const {
            store,
            setCalls,
            unsetCalls,
        } = buildApp();

        await store.login({
            name: 'admin',
            password: 'start123',
        });

        expect(setCalls).not.toHaveLength(0);
        for (const call of setCalls) {
            expect(call.options.path).toEqual('/');
        }

        await store.logout();

        expect(unsetCalls).not.toHaveLength(0);
        for (const call of unsetCalls) {
            expect(call.options.path).toEqual('/');
        }
    });

    // Copies written before the path was pinned sit on the browser's
    // default-path and WIN the read, so hydration would persist their
    // contents onto the pinned path: a stale refresh token replacing a live
    // one, replayed into family revocation on the next refresh. Every
    // `/`-boundary prefix of the document path is a candidate (a copy
    // written from `/console/account` sits on `/console`), plus the path
    // itself; only the pinned path (`/` here) is left alone.
    it('clears the pre-pinning copies that can reach the document', () => {
        setPathname('/console/account/password');

        const { unsetCalls } = buildApp();

        const paths = new Set(shadowingUnsets(unsetCalls).map((call) => call.options.path));
        expect(paths).toEqual(new Set(['/console', '/console/account', '/console/account/password']));

        for (const path of paths) {
            expect(unsetCalls
                .filter((call) => call.options.path === path)
                .map((call) => call.key)
                .sort())
                .toEqual(Object.values(CookieName).sort());
        }
    });

    // `/console/account` serves the console as well, and a copy written from
    // `/console/account/password` sits on exactly `/console/account`, which
    // path-matches it. Clearing only the document's default-path (`/console`
    // here) would leave it to win hydration.
    it('clears the mount path itself on a trailing-slash-less route', () => {
        setPathname('/console/account');

        const { unsetCalls } = buildApp();

        const paths = new Set(shadowingUnsets(unsetCalls).map((call) => call.options.path));
        expect(paths).toEqual(new Set(['/console', '/console/account']));
    });

    it('clears nothing when the document sits on the cookie path', () => {
        setPathname('/');

        const { unsetCalls } = buildApp();

        expect(shadowingUnsets(unsetCalls)).toHaveLength(0);
    });

    it('writes and clears every cookie at a host-declared path', async () => {
        setPathname('/auth/console/account/');

        const {
            store,
            setCalls,
            unsetCalls,
        } = buildApp({}, '/auth');

        // ignore the install-time migration drops
        setCalls.length = 0;
        unsetCalls.length = 0;

        await store.login({
            name: 'admin',
            password: 'start123',
        });

        await store.logout();

        expect(setCalls).not.toHaveLength(0);
        expect(unsetCalls).not.toHaveLength(0);
        for (const call of [...setCalls, ...unsetCalls]) {
            expect(call.options.path).toEqual('/auth');
        }
    });
});
