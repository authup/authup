// @vitest-environment node
/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import { StoreAuthStatus } from '../../../../src/core/store/constants.ts';
import { createStore, createStoreDispatcher } from '../../../../src/core/store/index.ts';

function countTokenRequests(httpClient: FakeClient) : number {
    return httpClient.requests.filter(
        (request) => request.method === 'POST' &&
            new URL(request.url, 'http://localhost').pathname === '/token',
    ).length;
}

function buildStore() {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token/introspect': () => {
                throw new Error('The access token expired.');
            },
            'POST /token': () => ({
                access_token: 'at-2',
                refresh_token: 'rt-2',
                expires_in: 3600,
                token_type: 'Bearer',
            }),
        },
    });

    const store = createStore({
        httpClient,
        dispatcher: createStoreDispatcher(),
    });

    return { store, httpClient };
}

describe('core/store (resolve, server render)', () => {
    it('does not refresh a refresh-token-only session', async () => {
        const { store, httpClient } = buildStore();

        store.refreshToken.value = 'rt-1';

        await store.resolve();

        expect(countTokenRequests(httpClient)).toEqual(0);
        expect(store.status.value).toEqual(StoreAuthStatus.RESTORING);
        expect(store.refreshToken.value).toEqual('rt-1');
    });

    it('does not refresh when revalidation fails with a refresh token', async () => {
        const { store, httpClient } = buildStore();

        store.accessToken.value = 'at-1';
        store.refreshToken.value = 'rt-1';

        await store.resolve();

        expect(countTokenRequests(httpClient)).toEqual(0);
        expect(store.status.value).toEqual(StoreAuthStatus.RESTORING);
        expect(store.refreshToken.value).toEqual('rt-1');
    });

    it('still rejects when revalidation fails without a refresh token', async () => {
        const { store, httpClient } = buildStore();

        store.accessToken.value = 'at-1';

        await expect(store.resolve()).rejects.toThrow();
        expect(countTokenRequests(httpClient)).toEqual(0);
    });
});
