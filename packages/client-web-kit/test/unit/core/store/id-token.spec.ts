/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import { createStore, createStoreDispatcher } from '../../../../src/core/store';

function buildStore() {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token': () => ({
                access_token: 'at',
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: 'rt',
                id_token: 'the-id-token',
            }),
            'POST /token/introspect': () => ({ active: true }),
            'POST /token/revoke': () => ({}),
        },
    });

    const store = createStore({
        httpClient,
        dispatcher: createStoreDispatcher(),
    });

    return { store, httpClient };
}

describe('core/store/id-token', () => {
    it('retains the grant response id_token', async () => {
        const { store } = buildStore();

        expect(store.idToken.value).toBeNull();

        await store.login({ name: 'admin', password: 'start123' });

        expect(store.idToken.value).toEqual('the-id-token');
    });

    it('clears the id_token on logout', async () => {
        const { store } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });
        expect(store.idToken.value).toEqual('the-id-token');

        await store.logout();

        expect(store.idToken.value).toBeNull();
    });

    it('keeps a retained id_token across a refresh grant response that carries none', async () => {
        const { store } = buildStore();

        store.setIdToken('previous-id-token');
        // a refresh response has no id_token — the retained one must survive
        store.applyTokenGrantResponse({
            access_token: 'at2',
            token_type: 'Bearer',
            expires_in: 3600,
            refresh_token: 'rt2',
        });

        expect(store.idToken.value).toEqual('previous-id-token');
    });

    it('clears a stale id_token on a fresh login whose response carries none', async () => {
        // a password-grant response carries no id_token — a retained one from a
        // previous identity must NOT survive onto the newly-authenticated user
        // (an RP logout would otherwise hint the OLD user's session).
        const httpClient = createFakeClient({
            handlers: {
                'POST /token': () => ({
                    access_token: 'at',
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: 'rt',
                }),
                'POST /token/introspect': () => ({ active: true }),
                'POST /token/revoke': () => ({}),
            },
        });

        const store = createStore({
            httpClient,
            dispatcher: createStoreDispatcher(),
        });

        store.setIdToken('stale-id-token');

        await store.login({ name: 'admin', password: 'start123' });

        expect(store.idToken.value).toBeNull();
    });
});
