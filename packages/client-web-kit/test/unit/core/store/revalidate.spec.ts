/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeClient } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import type { User } from '@authup/core-kit';
import { createStore, createStoreDispatcher } from '../../../../src/core/store';

const TOKEN_SUBJECT = 'user-1';

function buildStore() {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token/introspect': () => ({
                exp: 9999999999,
                sub: TOKEN_SUBJECT,
                sub_kind: 'user',
                session_id: 'sess-1',
                realm_id: 'realm-1',
                realm_name: 'master',
                permissions: [],
            }),
            'GET /userinfo': () => ({
                id: TOKEN_SUBJECT,
                name: 'admin',
                realmId: 'realm-1',
            }),
        },
    });

    const store = createStore({
        httpClient,
        dispatcher: createStoreDispatcher(),
    });

    return { store, httpClient };
}

function countUserInfoRequests(httpClient: FakeClient) : number {
    return httpClient.requests.filter(
        (request) => request.method === 'GET' &&
            new URL(request.url, 'http://localhost').pathname === '/userinfo',
    ).length;
}

describe('core/store/revalidate', () => {
    it('keeps a seeded user that is the token subject', async () => {
        const { store, httpClient } = buildStore();

        store.setAccessToken('at-1');
        store.setUser({
            id: TOKEN_SUBJECT,
            name: 'admin',
        } as User);

        await store.resolve();

        expect(countUserInfoRequests(httpClient)).toEqual(0);
        expect(store.user.value).toMatchObject({ id: TOKEN_SUBJECT });
    });

    // A seeded user (cookie hydration, raw seeding) is only as trustworthy as
    // its pairing with the token, and the two drift apart: a sibling login on
    // the same origin, an id left over from a previous provisioning run. It is
    // what the UI renders and what its forms write against, so a mismatch must
    // re-resolve instead of being carried for the app's lifetime.
    it('replaces a seeded user that is not the token subject', async () => {
        const { store, httpClient } = buildStore();

        store.setAccessToken('at-1');
        store.setUser({
            id: 'someone-else',
            name: 'stale',
        } as User);

        await store.resolve();

        expect(countUserInfoRequests(httpClient)).toEqual(1);
        expect(store.user.value).toMatchObject({
            id: TOKEN_SUBJECT,
            name: 'admin',
        });
    });

    it('resolves the user when none is present', async () => {
        const { store, httpClient } = buildStore();

        store.setAccessToken('at-1');

        await store.resolve();

        expect(countUserInfoRequests(httpClient)).toEqual(1);
        expect(store.user.value).toMatchObject({ id: TOKEN_SUBJECT });
    });
});
