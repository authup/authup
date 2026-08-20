/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import { createStore, createStoreDispatcher } from '../../../../src/core/store';

function buildStore(sessionId?: string) {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token/introspect': () => ({
                active: true,
                exp: 9999999999,
                sub: 'user-1',
                sub_kind: 'user',
                name: 'admin',
                ...(sessionId ? { session_id: sessionId } : {}),
                realm_id: 'realm-1',
                realm_name: 'master',
                permissions: [],
            }),
            'GET /userinfo': () => ({ id: 'user-1', name: 'admin' }),
            'POST /token/revoke': () => ({}),
        },
    });

    const store = createStore({
        httpClient,
        dispatcher: createStoreDispatcher(),
    });

    return { store, httpClient };
}

describe('core/store/session-id', () => {
    it('maps the introspection session_id onto the store sessionId ref', async () => {
        const { store } = buildStore('sess-123');

        expect(store.sessionId.value).toBeNull();

        store.setAccessToken('abc');
        await store.resolve();

        expect(store.sessionId.value).toEqual('sess-123');
    });

    it('leaves sessionId null when introspection carries none', async () => {
        const { store } = buildStore();

        store.setAccessToken('abc');
        await store.resolve();

        expect(store.sessionId.value).toBeNull();
    });

    it('clears sessionId on logout', async () => {
        const { store } = buildStore('sess-123');

        store.setAccessToken('abc');
        await store.resolve();
        expect(store.sessionId.value).toEqual('sess-123');

        await store.logout();
        expect(store.sessionId.value).toBeNull();
    });
});
