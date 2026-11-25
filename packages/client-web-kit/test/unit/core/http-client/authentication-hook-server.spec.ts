/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import type { ClientOptions } from '@authup/core-http-kit';
import type { TransportRequest } from 'hapic';
import { createPinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import { createApp, h } from 'vue';
import { injectHTTPClientAuthenticationHook, installHTTPClientAuthenticationHook } from '../../../../src/core/http-client/index.ts';
import { injectStore, installStore } from '../../../../src/core/store/index.ts';

type Transport = NonNullable<ClientOptions['transport']>;

const noop = () => undefined;

function isTokenRequest(request: TransportRequest) {
    return new URL(request.url).pathname.startsWith('/token');
}

/**
 * A real client over a transport: the fake client answers every request with
 * 200 and never reaches the response-error hook the refresh rides on.
 */
function buildApp(isServer: boolean) {
    const requests : TransportRequest[] = [];

    const transport : Transport = {
        dispatch: async (request) => {
            requests.push(request);

            const body = isTokenRequest(request) ?
                {
                    access_token: 'at-2',
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: 'rt-2',
                } :
                { message: 'The JWT is not active.' };

            return new Response(JSON.stringify(body), {
                status: isTokenRequest(request) ? 200 : 401,
                headers: { 'content-type': 'application/json' },
            });
        },
    };

    const createClient = () => new Client({ baseURL: 'http://fake.test/', transport });

    const pinia = createPinia();
    const app = createApp({ render: () => h('div') });

    app.use(pinia);

    installStore(app, {
        httpClient: createClient,
        pinia,
        cookieGet: noop,
        cookieSet: noop,
        cookieUnset: noop,
    });

    installHTTPClientAuthenticationHook(app, {
        httpClient: createClient,
        pinia,
        isServer,
    });

    const store = injectStore(pinia, app);
    const hook = injectHTTPClientAuthenticationHook(app);

    const client = createClient();

    // through the dispatcher, which is what enables the hook
    store.applyTokenGrantResponse({
        access_token: 'at-1',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'rt-1',
    });

    hook.attach(client);

    return {
        client,
        requests,
        store,
    };
}

describe('core/http-client/authentication-hook (server render)', () => {
    it('should not spend the refresh token on a 401 during a server render', async () => {
        const {
            client,
            requests,
            store,
        } = buildApp(true);

        await expect(client.realm.getMany()).rejects.toMatchObject({ response: { status: 401 } });

        // let a logout the hook might have started settle
        await new Promise((resolve) => {
            setTimeout(resolve, 0);
        });

        expect(requests.filter(isTokenRequest)).toHaveLength(0);
        expect(store.accessToken).toEqual('at-1');
        expect(store.refreshToken).toEqual('rt-1');
    });

    it('should refresh on a 401 in the browser', async () => {
        const {
            client,
            requests,
            store,
        } = buildApp(false);

        await expect(client.realm.getMany()).rejects.toMatchObject({ response: { status: 401 } });

        expect(requests.filter(isTokenRequest).length).toBeGreaterThan(0);
        expect(store.refreshToken).toEqual('rt-2');
    });
});
