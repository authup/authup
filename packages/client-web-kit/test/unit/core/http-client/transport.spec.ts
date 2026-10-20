/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientOptions } from '@authup/core-http-kit';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createApp, h } from 'vue';
import {
    injectHTTPClient,
    injectHTTPClientAuthenticationHook,
    installHTTPClient,
    installHTTPClientAuthenticationHook,
} from '../../../../src/core/http-client';
import { injectStore, installStore } from '../../../../src/core/store';

const noop = () => undefined;

type Transport = NonNullable<ClientOptions['transport']>;

/**
 * Answers every request with a 401, the way a refresh token bound to a
 * client that may no longer authenticate without a secret is answered.
 */
function createUnauthorizedTransport() : { transport: Transport, urls: string[] } {
    const urls : string[] = [];

    return {
        urls,
        transport: {
            dispatch: async (request) => {
                urls.push(request.url);

                return new Response(JSON.stringify({ code: 'invalid_client' }), {
                    status: 401,
                    headers: { 'content-type': 'application/json' },
                });
            },
        },
    };
}

function settlesWithin<T>(promise: Promise<T>, ms: number) : Promise<'settled' | 'hang'> {
    return Promise.race([
        promise.then(() => 'settled' as const, () => 'settled' as const),
        new Promise<'hang'>((resolve) => {
            setTimeout(() => resolve('hang'), ms);
        }),
    ]);
}

function buildApp(transport: Transport) {
    const pinia = createPinia();
    const app = createApp({ render: () => h('div') });
    app.use(pinia);

    const baseURL = 'https://auth.example.com/';

    installStore(app, {
        baseURL,
        transport,
        pinia,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
    });

    // A server render restores the session from the cookies before the hook
    // installs, which is what turns the hook on.
    const store = injectStore(pinia, app);
    store.accessToken = 'at-1';
    store.refreshToken = 'rt-1';

    installHTTPClientAuthenticationHook(app, {
        baseURL,
        transport,
        pinia,
        isServer: true,
    });

    installHTTPClient(app, {
        baseURL,
        transport,
        pinia,
        isServer: true,
    });

    return {
        store,
        hook: injectHTTPClientAuthenticationHook(app),
        client: injectHTTPClient(app),
    };
}

describe('core/http-client/transport', () => {
    it('dispatches the provided client and the hook\'s refresh through it', async () => {
        const { transport, urls } = createUnauthorizedTransport();
        const { client } = buildApp(transport);

        await settlesWithin(client.realm.getMany(), 2000);

        expect(urls.some((url) => url.includes('/realms'))).toBe(true);
        expect(urls.some((url) => url.endsWith('/token'))).toBe(true);
    });

    it('dispatches the store\'s own calls through it', async () => {
        const { transport, urls } = createUnauthorizedTransport();
        const { store } = buildApp(transport);

        await settlesWithin(store.logout(), 2000);

        expect(urls.some((url) => url.endsWith('/token/revoke'))).toBe(true);
    });

    it('keeps the refresh off the hooked client, so a 401 from /token settles', async () => {
        const { transport } = createUnauthorizedTransport();
        const { client, hook } = buildApp(transport);

        expect(await settlesWithin(client.realm.getMany(), 2000)).toEqual('settled');
        expect(await settlesWithin(hook.refresh(), 2000)).toEqual('settled');
    });
});
