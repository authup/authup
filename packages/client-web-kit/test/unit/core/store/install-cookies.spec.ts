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
    exp: 9999999999,
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

function buildApp(seed: Record<string, unknown> = {}, cookiePath?: string, cookiePrefix?: string) {
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
        cookiePrefix,
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
        jar,
    };
}

describe('core/store/install-cookies', () => {
    it('hydrates the store from cookies synchronously at install time', () => {
        const expireDate = '2099-01-01T00:00:00.000Z';
        const { store, setCalls } = buildApp({
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
        expect(store.user).toMatchObject({ id: 'user-1' });
        expect(store.realm).toMatchObject({ id: 'realm-1' });
        expect(store.realmManagement).toMatchObject({ id: 'realm-2' });

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

    it('persists cookies on login — except the realm cookie (introspection bypasses setRealm)', async () => {
        const { store, setCalls } = buildApp();

        await store.login({ name: 'admin', password: 'start123' });

        const keys = setCalls.map((call) => call.key);
        expect(keys).toContain(CookieName.ACCESS_TOKEN);
        expect(keys).toContain(CookieName.ACCESS_TOKEN_EXPIRE_DATE);
        expect(keys).toContain(CookieName.REFRESH_TOKEN);
        expect(keys).toContain(CookieName.ID_TOKEN);
        expect(keys).toContain(CookieName.USER);
        expect(keys).toContain(CookieName.REALM_MANAGEMENT);

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
            CookieName.USER,
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

    // A cookie stored without an explicit `Path` inherits the browser's
    // default-path, the directory of the writing document. The account
    // console at `/account` and the hosted auth pages at `/` are one origin
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
    // one, replayed into family revocation on the next refresh.
    it('clears the pre-pinning copies that can reach the document', () => {
        setPathname('/account/password');

        const { unsetCalls } = buildApp();

        const paths = new Set(unsetCalls.map((call) => call.options.path));
        expect(paths).toEqual(new Set(['/account', '/account/password']));

        for (const path of paths) {
            expect(unsetCalls
                .filter((call) => call.options.path === path)
                .map((call) => call.key)
                .sort())
                .toEqual(Object.values(CookieName).sort());
        }
    });

    // `/account` serves the console as well, and a copy written from
    // `/account/password` sits on exactly `/account` — which path-matches it.
    // Clearing only the document's default-path (`/` here) would leave it to
    // win hydration.
    it('clears the mount path itself on a trailing-slash-less route', () => {
        setPathname('/account');

        const { unsetCalls } = buildApp();

        const paths = new Set(unsetCalls.map((call) => call.options.path));
        expect(paths).toEqual(new Set(['/account']));
    });

    it('clears nothing when the document sits on the cookie path', () => {
        setPathname('/');

        const { unsetCalls } = buildApp();

        expect(unsetCalls).toHaveLength(0);
    });

    it('writes and clears every cookie at a host-declared path', async () => {
        setPathname('/auth/account/');

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

describe('core/store/install-cookies (per-client namespace)', () => {
    const PREFIX = 'account-console';
    const name = (key: string) => `${PREFIX}.${key}`;

    it('hydrates from the namespaced cookies', () => {
        const { store } = buildApp({
            [name(CookieName.ACCESS_TOKEN)]: 'mine-at',
            [name(CookieName.ACCESS_TOKEN_EXPIRE_DATE)]: '2099-01-01T00:00:00.000Z',
            [name(CookieName.REFRESH_TOKEN)]: 'mine-rt',
            [name(CookieName.REALM)]: { id: 'realm-1', name: 'master' },
        }, undefined, PREFIX);

        expect(store.accessToken).toEqual('mine-at');
        expect(store.refreshToken).toEqual('mine-rt');
        expect(store.realm).toMatchObject({ id: 'realm-1' });
    });

    it('does NOT adopt the bare tier', () => {
        // The bare names are the IdP's own SSO session, written by the hosted
        // auth pages on the same origin. A namespaced app must ignore them:
        // adopting them is the whole defect this replaces.
        const { store } = buildApp({
            [CookieName.ACCESS_TOKEN]: 'sso-at',
            [CookieName.REFRESH_TOKEN]: 'sso-rt',
            [CookieName.USER]: { id: 'someone-else', name: 'other' },
        }, undefined, PREFIX);

        expect(store.accessToken).toBeNull();
        expect(store.refreshToken).toBeNull();
        expect(store.user).toBeNull();
        expect(store.loggedIn).toBe(false);
    });

    it('writes only namespaced cookies, leaving the bare tier untouched', async () => {
        const {
            store, 
            setCalls, 
            jar, 
        } = buildApp({ [CookieName.ACCESS_TOKEN]: 'sso-at' }, undefined, PREFIX);

        await store.login({ name: 'admin', password: 'start123' });

        expect(setCalls).not.toHaveLength(0);
        for (const call of setCalls) {
            expect(call.key.startsWith(`${PREFIX}.`)).toBe(true);
        }

        // the reverse leak: this app's tokens are not readable under the bare
        // names, so the next surface on the origin cannot pick them up
        expect(jar.get(CookieName.ACCESS_TOKEN)).toEqual('sso-at');
        expect(jar.get(name(CookieName.ACCESS_TOKEN))).toEqual('at-1');
    });

    it('keeps the pinned hydration order under a prefix', () => {
        // The expire date must still hydrate before the access token, or the
        // write-back echo re-persists the token as a session cookie.
        const { setCalls } = buildApp({
            [name(CookieName.ACCESS_TOKEN)]: 'mine-at',
            [name(CookieName.ACCESS_TOKEN_EXPIRE_DATE)]: '2099-01-01T00:00:00.000Z',
        }, undefined, PREFIX);

        const echo = setCalls.find((call) => call.key === name(CookieName.ACCESS_TOKEN));
        expect(echo!.options.maxAge).toBeTypeOf('number');
        expect(echo!.options.maxAge!).toBeGreaterThan(0);
    });

    it('clears only its own names when dropping shadowing copies', () => {
        // The clear only runs for a path with segments, so the document has
        // to sit below the root for this to exercise anything.
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { pathname: '/account/password' },
        });

        try {
            const { unsetCalls } = buildApp({}, undefined, PREFIX);

            expect(unsetCalls).not.toHaveLength(0);

            // Every clear targets this app's namespace. Clearing the bare
            // tier would sign the visitor out of the IdP as a side effect of
            // loading this app.
            for (const call of unsetCalls) {
                expect(call.key.startsWith(`${PREFIX}.`)).toBe(true);
            }

            // and it does reach its own names on a shadowing path
            expect(unsetCalls.some(
                (call) => call.key === name(CookieName.ACCESS_TOKEN) &&
                    call.options.path === '/account',
            )).toBe(true);
        } finally {
            Object.defineProperty(window, 'location', {
                configurable: true,
                writable: true,
                value: { pathname: '/' },
            });
        }
    });
});
