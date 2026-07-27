/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
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

function buildApp(seed: Record<string, unknown> = {}) {
    const jar = new Map<string, unknown>(Object.entries(seed));
    const setCalls : CookieSetCall[] = [];
    const unsetCalls : string[] = [];

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
        cookieUnset: (key) => {
            unsetCalls.push(key);
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

        expect(unsetCalls).toEqual([
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
