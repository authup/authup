/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeHandler } from '@authup/core-http-kit/testing';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createApp, h } from 'vue';
import { injectHTTPClientAuthenticationHook, installHTTPClientAuthenticationHook } from '../../../../src/core/http-client';
import { injectStore, installStore } from '../../../../src/core/store';

const noop = () => undefined;

function buildApp(handlers: Record<string, FakeHandler> = {}) {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token/revoke': () => ({}),
            ...handlers,
        },
    });

    const pinia = createPinia();
    const app = createApp({ render: () => h('div') });
    app.use(pinia);

    installStore(app, {
        httpClient,
        pinia,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
    });

    installHTTPClientAuthenticationHook(app, {
        httpClient,
        pinia,
        isServer: true,
    });

    const store = injectStore(pinia, app);
    const hook = injectHTTPClientAuthenticationHook(app);

    return {
        store, 
        hook, 
        httpClient, 
    };
}

describe('core/http-client/authentication-hook', () => {
    it('applies a finished background refresh onto the store', async () => {
        const { store, hook } = buildApp({
            'POST /token': () => ({
                access_token: 'at-2',
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: 'rt-2',
            }),
        });

        store.setAccessToken('at-1');
        store.setRefreshToken('rt-1');

        await hook.refresh();

        expect(store.accessToken).toEqual('at-2');
        expect(store.refreshToken).toEqual('rt-2');
    });

    it('drops a refresh whose source token was replaced mid-flight', async () => {
        const { promise: gate, resolve: release } = Promise.withResolvers<void>();

        const {
            store, 
            hook, 
            httpClient, 
        } = buildApp({
            'POST /token': async () => {
                await gate;

                return {
                    access_token: 'at-stale',
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: 'rt-stale',
                };
            },
        });

        store.setAccessToken('at-1');
        store.setRefreshToken('rt-1');

        hook.attach(httpClient);

        const refresh = hook.refresh();

        // an interactive login/exchange (or logout) replaced the session while
        // the refresh grant was in flight — its response must NOT be applied
        // (it would overwrite the new session's tokens with the old one's)
        store.setRefreshToken('rt-new');
        release();

        await refresh;

        expect(store.accessToken).toEqual('at-1');
        expect(store.refreshToken).toEqual('rt-new');

        // the hook applied the stale response to itself before the drop guard
        // ran — attached clients must be re-synced onto the store's bearer,
        // never left on the dropped session's.
        expect(httpClient.getAuthorizationHeader()).toContain('at-1');

        // the dropped pair was never written to the store, so nothing else
        // could revoke it — the drop guard revokes it best-effort.
        await new Promise((resolve) => { setTimeout(resolve, 0); });
        const revoked = httpClient.requests
            .filter((request) => request.url === '/token/revoke')
            .map((request) => (request.body as Record<string, string>).token);
        expect(revoked).toContain('at-stale');
        expect(revoked).toContain('rt-stale');
    });

    it('drops a refresh that finishes after a logout tore the session down', async () => {
        const { promise: gate, resolve: release } = Promise.withResolvers<void>();

        const {
            store, 
            hook, 
            httpClient, 
        } = buildApp({
            'POST /token': async () => {
                await gate;

                return {
                    access_token: 'at-stale',
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: 'rt-stale',
                };
            },
        });

        store.setAccessToken('at-1');
        store.setRefreshToken('rt-1');

        hook.attach(httpClient);

        const refresh = hook.refresh();

        await store.logout();
        release();

        await refresh;

        // logout stays final — the late refresh must not resurrect a session
        expect(store.accessToken).toBeNull();
        expect(store.refreshToken).toBeNull();

        // ... and must not linger as the attached clients' bearer either
        expect(httpClient.getAuthorizationHeader()).toBeUndefined();

        // the dropped pair is revoked best-effort (alongside logout()'s own
        // revoke of the presented pair)
        await new Promise((resolve) => { setTimeout(resolve, 0); });
        const revoked = httpClient.requests
            .filter((request) => request.url === '/token/revoke')
            .map((request) => (request.body as Record<string, string>).token);
        expect(revoked).toContain('at-stale');
        expect(revoked).toContain('rt-stale');
    });
});
