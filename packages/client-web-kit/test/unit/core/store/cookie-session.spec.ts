/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CookieName } from '@authup/core-http-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeHandlerMap } from '@authup/core-http-kit/testing';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createApp, h } from 'vue';
import { installHTTPClient, installHTTPClientAuthenticationHook } from '../../../../src/core/http-client';
import { StoreAuthStatus, injectStore, installStore } from '../../../../src/core/store';
import type { CookieOptions } from '../../../../src/types';

const SESSION_RESPONSE = {
    active: true,
    sub: 'user-1',
    sub_kind: 'user',
    name: 'admin',
    session_id: 'sess-1',
    realm_id: 'realm-1',
    realm_name: 'master',
    scope: 'global openid',
    permissions: [],
};

type CookieUnsetCall = {
    key: string,
    options: CookieOptions
};

function createResponseError(status: number, message: string) {
    return Object.assign(new Error(message), {
        response: {
            status,
            data: { message },
        },
    });
}

function buildApp(options: {
    cookieSession?: boolean,
    seed?: Record<string, unknown>,
    handlers?: FakeHandlerMap
} = {}) {
    const jar = new Map<string, unknown>(Object.entries(options.seed ?? {}));
    const unsetCalls : CookieUnsetCall[] = [];

    const httpClient = createFakeClient({
        handlers: {
            'GET /sessions/@me/introspect': () => ({ ...SESSION_RESPONSE }),
            'DELETE /sessions/@me': () => null,
            'POST /token/revoke': () => ({}),
            ...options.handlers,
        },
    });

    const pinia = createPinia();
    const app = createApp({ render: () => h('div') });
    app.use(pinia);

    // Mirrors the install order in src/module.ts.
    installStore(app, {
        httpClient,
        pinia,
        cookieSession: options.cookieSession,
        cookieGet: (key) => jar.get(key),
        cookieSet: (key, value) => {
            jar.set(key, value);
        },
        cookieUnset: (key, opts) => {
            unsetCalls.push({ key, options: opts });
            jar.delete(key);
        },
    });

    installHTTPClientAuthenticationHook(app, {
        httpClient,
        pinia,
        isServer: true,
    });

    installHTTPClient(app, {
        httpClient,
        pinia,
        isServer: true,
    });

    return {
        store: injectStore(pinia, app),
        httpClient,
        unsetCalls,
    };
}

describe('core/store/cookie-session', () => {
    // Finding 1 of plan 088, as an executable assertion: the hosted auth
    // pages write their token cookies at the same path on the same origin, so
    // seeding them would hand the console a bearer — and header-wins
    // precedence means the server's cookie branch would never run.
    it('never turns a pre-existing access-token cookie into an authorization header', () => {
        const { store, httpClient } = buildApp({
            cookieSession: true,
            seed: {
                [CookieName.ACCESS_TOKEN]: 'cookie-at',
                [CookieName.ACCESS_TOKEN_EXPIRE_DATE]: '2099-01-01T00:00:00.000Z',
                [CookieName.REFRESH_TOKEN]: 'cookie-rt',
                [CookieName.ID_TOKEN]: 'cookie-idt',
            },
        });

        expect(httpClient.getAuthorizationHeader()).toBeUndefined();
        expect(store.accessToken).toBeNull();
        expect(store.refreshToken).toBeNull();
        expect(store.idToken).toBeNull();
        expect(store.status).toEqual(StoreAuthStatus.UNAUTHENTICATED);
    });

    // The control: bearer mode is the untouched default for every other
    // consumer, so the same seed must still produce a bearer.
    it('seeds the same cookie into a bearer in the default mode', () => {
        const { store, httpClient } = buildApp({
            seed: {
                [CookieName.ACCESS_TOKEN]: 'cookie-at',
                [CookieName.REFRESH_TOKEN]: 'cookie-rt',
            },
        });

        expect(httpClient.getAuthorizationHeader()).toEqual('Bearer cookie-at');
        expect(store.accessToken).toEqual('cookie-at');
    });

    it('resolves the session from the account endpoint', async () => {
        const { store, httpClient } = buildApp({ cookieSession: true });

        await store.resolve();

        expect(store.status).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(store.user).toMatchObject({ id: 'user-1', name: 'admin' });
        expect(store.realm).toMatchObject({ id: 'realm-1', name: 'master' });
        expect(store.sessionId).toEqual('sess-1');

        // no token to introspect, and none to renew
        expect(store.accessToken).toBeNull();
        const paths = httpClient.requests.map(
            (request) => new URL(request.url, 'http://localhost').pathname,
        );
        expect(paths).toContain('/sessions/@me/introspect');
        expect(paths).not.toContain('/token/introspect');
        expect(paths).not.toContain('/token');
    });

    // RESTORING must be unreachable: the account console's router guard reads
    // a settled RESTORING as a failed resolve and signs out.
    it('settles an absent session as unauthenticated', async () => {
        const { store } = buildApp({
            cookieSession: true,
            handlers: { 'GET /sessions/@me/introspect': () => ({ active: false }) },
        });

        await store.resolve();

        expect(store.status).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.user).toBeNull();
    });

    // Nothing pushes a revocation into cookie mode (the authentication hook is
    // inert, no SESSION_EXPIRED listener), so an already-validated session must
    // still be re-read on every resolve. Otherwise a session ended elsewhere
    // renders as signed in until a reload.
    it('settles a revoked session as unauthenticated on the next resolve', async () => {
        // the resolve() promise-share dedup clears one macrotask after settle
        // (pinned in lifecycle.spec.ts): step past it between the resolve()s
        const nextMacroTask = () => new Promise((resolve) => {
            setTimeout(resolve, 0);
        });

        let revoked = false;
        const { store, httpClient } = buildApp({
            cookieSession: true,
            handlers: {
                'GET /sessions/@me/introspect': () => {
                    if (revoked) {
                        throw createResponseError(401, 'The session is no longer active.');
                    }

                    return { ...SESSION_RESPONSE };
                },
            },
        });

        await store.resolve();
        expect(store.status).toEqual(StoreAuthStatus.AUTHENTICATED);

        const introspects = () => httpClient.requests.filter(
            (request) => new URL(request.url, 'http://localhost').pathname === '/sessions/@me/introspect',
        ).length;
        expect(introspects()).toEqual(1);

        await nextMacroTask();

        revoked = true;
        await store.resolve();

        expect(introspects()).toEqual(2);
        expect(store.status).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.user).toBeNull();
        expect(store.realm).toBeNull();
    });

    it('propagates a non-401 cookie-session failure', async () => {
        const error = createResponseError(503, 'Service unavailable.');
        const { store } = buildApp({
            cookieSession: true,
            handlers: {
                'GET /sessions/@me/introspect': () => {
                    throw error;
                },
            },
        });

        await expect(store.resolve()).rejects.toBe(error);
    });

    it('does not let a stale 401 clear a newer session', async () => {
        const { promise: gate, resolve: release } = Promise.withResolvers<void>();
        const { store } = buildApp({
            cookieSession: true,
            handlers: {
                'GET /sessions/@me/introspect': async () => {
                    await gate;

                    throw createResponseError(401, 'The old session is no longer active.');
                },
            },
        });

        const resolving = store.resolve();

        await store.logout({ revoke: false });
        store.setRealm({ id: 'realm-new', name: 'new-realm' });
        store.setUser({
            id: 'user-new',
            name: 'new-user',
            displayName: 'New User',
            email: 'new@example.com',
        });

        release();
        await resolving;

        expect(store.status).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(store.user).toMatchObject({ id: 'user-new' });
        expect(store.realm).toMatchObject({ id: 'realm-new' });
    });

    it('ends the session over the wire on logout, without clearing the origin token cookies', async () => {
        const {
            store, 
            httpClient, 
            unsetCalls, 
        } = buildApp({ cookieSession: true });

        await store.resolve();
        expect(store.status).toEqual(StoreAuthStatus.AUTHENTICATED);

        await store.logout();

        expect(httpClient.requests.some(
            (request) => request.method === 'DELETE' &&
                new URL(request.url, 'http://localhost').pathname === '/sessions/@me',
        )).toBe(true);
        expect(store.status).toEqual(StoreAuthStatus.UNAUTHENTICATED);

        // The token cookies on this origin are the hosted auth console's
        // lingering SSO session, which prompt=none / prompt=select_account
        // depend on for every other RP. The console ignores them; it must
        // never destroy them.
        const cleared = unsetCalls
            .filter((call) => call.options.path === '/')
            .map((call) => call.key);
        expect(cleared).not.toContain(CookieName.ACCESS_TOKEN);
        expect(cleared).not.toContain(CookieName.REFRESH_TOKEN);
        expect(cleared).not.toContain(CookieName.ID_TOKEN);
        expect(cleared).not.toContain(CookieName.ACCESS_TOKEN_EXPIRE_DATE);
    });
});
