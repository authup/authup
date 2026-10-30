/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import type { ClientOptions, IClient } from '@authup/core-http-kit';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createApp, h } from 'vue';
import {
    buildHTTPClient,
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
function createUnauthorizedTransport(
    body: Record<string, any> = { code: 'invalid_client' },
) : { transport: Transport, urls: string[] } {
    const urls : string[] = [];

    return {
        urls,
        transport: {
            dispatch: async (request) => {
                urls.push(request.url);

                return new Response(JSON.stringify(body), {
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

function buildApp(transport: Transport, options: { shared?: boolean } = {}) {
    const pinia = createPinia();
    const app = createApp({ render: () => h('div') });

    app.use(pinia);

    const clients : IClient[] = [];
    const createClient = () => {
        const client = new Client({ baseURL: 'https://auth.example.com/', transport });

        clients.push(client);

        return client;
    };

    // One instance: the hook refreshes on the client it is attached to.
    const httpClient = options.shared ? createClient() : createClient;

    installStore(app, {
        httpClient,
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
        store,
        clients,
        hook: injectHTTPClientAuthenticationHook(app),
        client: injectHTTPClient(app),
    };
}

describe('core/http-client/build', () => {
    it('calls a client function once per call', () => {
        const httpClient = () => new Client({ baseURL: 'https://auth.example.com/' });

        expect(buildHTTPClient({ httpClient })).not.toBe(buildHTTPClient({ httpClient }));
    });

    it('returns a client instance as it is', () => {
        const httpClient = new Client({ baseURL: 'https://auth.example.com/' });

        expect(buildHTTPClient({ httpClient })).toBe(httpClient);
    });

    it('builds a client from baseURL without httpClient', () => {
        expect(buildHTTPClient({ baseURL: 'https://auth.example.com/' }).getBaseURL())
            .toEqual('https://auth.example.com/');
    });

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

    it('refreshes on a client other than the one the hook is attached to', async () => {
        const { transport } = createUnauthorizedTransport();
        const { client, clients } = buildApp(transport);
        const before = clients.length;

        await settlesWithin(client.realm.getMany(), 2000);

        expect(clients.length).toBeGreaterThan(before);
        expect(clients.slice(before)).not.toContain(client);
    });

    it('settles a 401 from /token during a refresh', async () => {
        const { transport } = createUnauthorizedTransport();
        const { client, hook } = buildApp(transport);

        expect(await settlesWithin(client.realm.getMany(), 2000)).toEqual('settled');
        expect(await settlesWithin(hook.refresh(), 2000)).toEqual('settled');
    });

    it('settles a 401 from /token during a refresh with one client instance', async () => {
        const urls : string[] = [];
        const transport : Transport = {
            dispatch: async (request) => {
                urls.push(request.url);

                // a dead bearer on the resource route, and the body authup's
                // token endpoint answers a refused client with
                const body = request.url.endsWith('/token') ?
                    {
                        code: 'invalid_client',
                        error: 'invalid_client',
                        message: 'Client authentication failed',
                    } :
                    { code: 'expired_token', message: 'The token is expired.' };

                return new Response(JSON.stringify(body), {
                    status: 401,
                    headers: { 'content-type': 'application/json' },
                });
            },
        };
        const { client, clients } = buildApp(transport, { shared: true });

        expect(clients).toHaveLength(1);
        expect(await settlesWithin(client.realm.getMany(), 2000)).toEqual('settled');
        expect(urls.some((url) => url.endsWith('/token'))).toBe(true);
    });
});
