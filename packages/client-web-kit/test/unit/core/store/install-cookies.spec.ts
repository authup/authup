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
    vi,
} from 'vitest';
import { createApp, h } from 'vue';
import type { CookieOptions } from '../../../../src/types';
import { StoreAuthStatus, injectStore, installStore } from '../../../../src/core/store';
import { install } from '../../../../src/module';
import { buildAuthorizationCatalog } from '../../../utils/authorization';

const defaultCookies = vi.hoisted(() => ({ removeCalls: [] as { key: string, options: Record<string, any> }[] }));

vi.mock('@vueuse/integrations/useCookies', () => ({
    useCookies: () => ({
        get: () => undefined,
        set: () => undefined,
        remove: (key: string, options: Record<string, any>) => {
            defaultCookies.removeCalls.push({ key, options });
        },
    }),
}));

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

type BuildAppOptions = {
    seed?: Record<string, unknown>,
    cookiePath?: string,
    cookieSecure?: boolean,
    cookieShadowCleanup?: boolean,
};

function buildApp(options: BuildAppOptions = {}) {
    const {
        seed = {},
        cookiePath,
        cookieSecure,
        cookieShadowCleanup,
    } = options;
    const jar = new Map<string, unknown>(Object.entries(seed));
    const setCalls : CookieSetCall[] = [];
    const unsetCalls : CookieUnsetCall[] = [];

    const httpClient = createFakeClient({
        handlers: {
            'POST /token': () => ({ ...GRANT_RESPONSE }),
            'POST /token/introspect': () => ({ ...INTROSPECTION_RESPONSE }),
            'GET /userinfo': () => ({ ...USER_RESPONSE }),
            'GET /authorization': () => buildAuthorizationCatalog(),
            'POST /token/revoke': () => ({}),
        },
    });

    const pinia = createPinia();
    const app = createApp({ render: () => h('div') });

    app.use(pinia);

    installStore(app, {
        cookiePath,
        cookieSecure,
        cookieShadowCleanup,
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
            seed: {
                [CookieName.ACCESS_TOKEN]: 'cookie-at',
                [CookieName.ACCESS_TOKEN_EXPIRE_DATE]: expireDate,
                [CookieName.REFRESH_TOKEN]: 'cookie-rt',
                [CookieName.ID_TOKEN]: 'cookie-idt',
                [CookieName.REALM]: { id: 'realm-1', name: 'master' },
                [CookieName.REALM_MANAGEMENT]: { id: 'realm-2', name: 'other' },
            },
        });

        expect(store.cookiesRead).toBe(true);
        expect(store.accessToken).toEqual('cookie-at');
        expect(store.accessTokenExpireDate).toBeInstanceOf(Date);
        expect((store.accessTokenExpireDate as Date).getTime()).toEqual(new Date(expireDate).getTime());
        expect(store.refreshToken).toEqual('cookie-rt');
        expect(store.idToken).toEqual('cookie-idt');
        expect(store.realmManagement).toMatchObject({ id: 'realm-2' });

        // the realm is re-derived by resolve(), never read from the jar, and
        // the user record is not persisted at all
        expect(store.realm).toBeNull();
        expect(store.user).toBeNull();

        // the tokens are read without being written back; the management
        // realm is re-persisted through its narrowing setter
        expect(setCalls.map((call) => call.key)).toEqual([CookieName.REALM_MANAGEMENT]);
        expect(unsetCalls).toHaveLength(0);

        // restorable before any network validation ran
        expect(store.status).toEqual(StoreAuthStatus.RESTORING);
    });

    it('persists cookies on login — except the realm and the user record', async () => {
        const { store, setCalls } = buildApp();

        await store.login({ name: 'admin', password: 'start123' });

        const keys = setCalls.map((call) => call.key);

        expect(keys).toContain(CookieName.ACCESS_TOKEN);
        expect(keys).toContain(CookieName.ACCESS_TOKEN_EXPIRE_DATE);
        expect(keys).toContain(CookieName.REFRESH_TOKEN);
        expect(keys).toContain(CookieName.ID_TOKEN);
        expect(keys).toContain(CookieName.REALM_MANAGEMENT);

        // neither reaches the jar, but the store holds both
        expect(store.user).toMatchObject({ id: 'user-1' });
        expect(keys).not.toContain(CookieName.REALM);
        expect(store.realm).toMatchObject({ id: 'realm-1' });

        // the access-token cookie rides the grant-derived expire date
        const accessTokenCall = setCalls.find((call) => call.key === CookieName.ACCESS_TOKEN);

        expect(accessTokenCall).toBeDefined();
        expect(accessTokenCall!.options.maxAge).toBeTypeOf('number');
        expect(accessTokenCall!.options.maxAge!).toBeGreaterThan(0);
        expect(accessTokenCall!.options.maxAge!).toBeLessThanOrEqual(3600);
    });

    it('narrows a whole realm row to its id, name and display name before it reaches the realm cookie', () => {
        const { store, setCalls } = buildApp();

        const row = {
            id: 'realm-2',
            name: 'other',
            displayName: 'Other',
            description: 'never persisted',
        };

        store.setRealmManagement(row);

        const realmCall = setCalls.find((call) => call.key === CookieName.REALM_MANAGEMENT);

        expect(realmCall).toBeDefined();
        expect(realmCall!.value).toStrictEqual({
            id: 'realm-2',
            name: 'other',
            displayName: 'Other',
        });
        expect(store.realmManagement).toStrictEqual({
            id: 'realm-2',
            name: 'other',
            displayName: 'Other',
        });
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

        const { unsetCalls } = buildApp({ cookieShadowCleanup: true });

        const paths = new Set(unsetCalls.map((call) => call.options.path));

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

        const { unsetCalls } = buildApp({ cookieShadowCleanup: true });

        const paths = new Set(unsetCalls.map((call) => call.options.path));

        expect(paths).toEqual(new Set(['/console', '/console/account']));
    });

    it('clears nothing when the document sits on the cookie path', () => {
        setPathname('/');

        const { unsetCalls } = buildApp({ cookieShadowCleanup: true });

        expect(unsetCalls).toHaveLength(0);
    });

    it('writes and clears every cookie at a host-declared path', async () => {
        setPathname('/auth/console/account/');

        const {
            store,
            setCalls,
            unsetCalls,
        } = buildApp({ cookiePath: '/auth' });

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

describe('core/store/install-cookies shadow cleanup (#3798)', () => {
    const setPathname = (pathname: string) => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { pathname },
        });
    };

    const SEED = {
        [CookieName.ACCESS_TOKEN]: 'cookie-at',
        [CookieName.ACCESS_TOKEN_EXPIRE_DATE]: '2099-01-01T00:00:00.000Z',
        [CookieName.REFRESH_TOKEN]: 'cookie-rt',
        [CookieName.ID_TOKEN]: 'cookie-idt',
    };

    const unsetPaths = (calls: CookieUnsetCall[]) => new Set(calls.map((call) => call.options.path));

    afterEach(() => {
        setPathname('/');
        defaultCookies.removeCalls.length = 0;
    });

    // The harness jar ignores `path`, like a host store over sessionStorage:
    // any install-time unset would delete the session it is about to read.
    it.each([
        ['/console/account/password', undefined],
        ['/ui/', '/ui/'],
        ['/ui/runs', '/ui/'],
        ['/ui/runs', '/ui'],
    ])('keeps the session of host-supplied cookie functions on %s (cookiePath %s)', (pathname, cookiePath) => {
        setPathname(pathname);

        const { store, unsetCalls } = buildApp({ seed: SEED, cookiePath });

        expect(unsetCalls).toHaveLength(0);
        expect(store.accessToken).toEqual('cookie-at');
        expect(store.refreshToken).toEqual('cookie-rt');
    });

    it('cleans up through the default writer when the host supplies only cookieGet', () => {
        setPathname('/console/account/password');

        installStore(createApp({ render: () => h('div') }), {
            pinia: createPinia(),
            cookieGet: () => undefined,
        });

        expect(new Set(defaultCookies.removeCalls.map((call) => call.options.path)))
            .toEqual(new Set(['/console', '/console/account', '/console/account/password']));
    });

    it('cleans up nothing through the default writer when the host opts out', () => {
        setPathname('/console/account/password');

        installStore(createApp({ render: () => h('div') }), {
            pinia: createPinia(),
            cookieGet: () => undefined,
            cookieShadowCleanup: false,
        });

        expect(defaultCookies.removeCalls).toHaveLength(0);
    });

    it('passes the opt-in through the kit install', () => {
        setPathname('/console/account/password');

        const unsetCalls : CookieUnsetCall[] = [];
        const pinia = createPinia();
        const app = createApp({ render: () => h('div') });

        app.use(pinia);

        install(app, {
            pinia,
            baseURL: 'http://localhost:3001',
            httpClient: createFakeClient(),
            components: false,
            isServer: true,
            cookieGet: () => undefined,
            cookieSet: () => undefined,
            cookieUnset: (key, options) => {
                unsetCalls.push({ key, options });
            },
            cookieShadowCleanup: true,
        });

        expect(unsetPaths(unsetCalls))
            .toEqual(new Set(['/console', '/console/account', '/console/account/password']));
    });

    // A copy on the `/ui` default-path is a stale shadow: it is the only one
    // a document at exactly `/ui` sees. So the trailing slash is dropped from
    // the pinned path instead of exempting `/ui` from the cleanup.
    it('writes on a cookie path without its trailing slash', async () => {
        const {
            store, 
            setCalls, 
            unsetCalls, 
        } = buildApp({ cookiePath: '/ui/' });

        await store.login({ name: 'admin', password: 'start123' });
        await store.logout();

        expect(setCalls).not.toHaveLength(0);
        expect(unsetCalls).not.toHaveLength(0);

        for (const call of [...setCalls, ...unsetCalls]) {
            expect(call.options.path).toEqual('/ui');
        }
    });

    it('clears the copies a trailing-slash cookie path left behind', () => {
        setPathname('/ui/runs');

        const { unsetCalls } = buildApp({ cookiePath: '/ui/', cookieShadowCleanup: true });

        expect(unsetPaths(unsetCalls)).toEqual(new Set(['/ui/runs', '/ui/']));
    });

    // An unset on a relative path would land on the document's default-path,
    // which is where the normalized session now lives.
    it('writes a relative cookie path from the root and never clears it raw', async () => {
        setPathname('/ui/runs');

        const {
            store, 
            setCalls, 
            unsetCalls, 
        } = buildApp({ cookiePath: 'ui', cookieShadowCleanup: true });

        expect(unsetPaths(unsetCalls)).toEqual(new Set(['/ui/runs']));

        await store.login({ name: 'admin', password: 'start123' });

        for (const call of setCalls) {
            expect(call.options.path).toEqual('/ui');
        }
    });
});

describe('core/store/install-cookies attributes', () => {
    const setLocation = (protocol: string) => {
        Object.defineProperty(window, 'location', {
            configurable: true,
            writable: true,
            value: { pathname: '/', protocol },
        });
    };

    afterEach(() => {
        setLocation('http:');
    });

    it('marks every stored cookie secure on an https origin', async () => {
        setLocation('https:');

        const { store, setCalls } = buildApp();

        await store.login({ name: 'admin', password: 'start123' });

        expect(setCalls).not.toHaveLength(0);

        for (const call of setCalls) {
            expect(call.options.secure).toBe(true);
            expect(call.options.sameSite).toEqual('lax');
        }
    });

    it('marks every stored cookie secure when the host says the request is https', async () => {
        setLocation('http:');

        const { store, setCalls } = buildApp({ cookieSecure: true });

        await store.login({ name: 'admin', password: 'start123' });

        expect(setCalls).not.toHaveLength(0);

        for (const call of setCalls) {
            expect(call.options.secure).toBe(true);
        }
    });

    it('leaves secure off on a plain http origin', async () => {
        setLocation('http:');

        const { store, setCalls } = buildApp();

        await store.login({ name: 'admin', password: 'start123' });

        expect(setCalls).not.toHaveLength(0);

        for (const call of setCalls) {
            expect(call.options.secure).toBeUndefined();
            expect(call.options.sameSite).toEqual('lax');
        }
    });
});
