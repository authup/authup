/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient, FakeRequest } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import { createStore, createStoreDispatcher } from '../../../../src/core/store';

function buildStore() {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token': () => ({
                access_token: 'xyz',
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: 'abc',
            }),
        },
    });

    const store = createStore({
        httpClient,
        dispatcher: createStoreDispatcher(),
    });

    return { store, httpClient };
}

function findTokenRequest(httpClient: FakeClient) : FakeRequest | undefined {
    return httpClient.requests.find(
        (request) => request.method === 'POST' &&
            new URL(request.url, 'http://localhost').pathname === '/token',
    );
}

describe('core/store/login', () => {
    it('should transmit realm_id for login with realmId', async () => {
        const { store, httpClient } = buildStore();

        expect(store.realmId.value).toBeFalsy();

        await store.login({
            name: 'admin',
            password: 'start123',
            realmId: 'realm-x',
        });

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();
        expect(request!.body).toMatchObject({
            grant_type: 'password',
            username: 'admin',
            password: 'start123',
            realm_id: 'realm-x',
        });
    });

    it('should omit realm_id for login without realmId', async () => {
        const { store, httpClient } = buildStore();

        await store.login({
            name: 'admin',
            password: 'start123',
        });

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();

        const body = request!.body as Record<string, string>;
        expect(body.grant_type).toEqual('password');
        expect('realm_id' in body).toBe(false);
    });

    it('should omit realm_id for login with empty realmId', async () => {
        const { store, httpClient } = buildStore();

        await store.login({
            name: 'admin',
            password: 'start123',
            realmId: '',
        });

        const request = findTokenRequest(httpClient);
        expect(request).toBeDefined();
        expect('realm_id' in (request!.body as Record<string, string>)).toBe(false);
    });
});
