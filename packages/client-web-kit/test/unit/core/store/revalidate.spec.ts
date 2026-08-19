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
                name: 'admin',
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

function buildStoreWithSubjectKind(subKind: string) {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token/introspect': () => ({
                exp: 9999999999,
                sub: TOKEN_SUBJECT,
                sub_kind: subKind,
                realm_id: 'realm-1',
                realm_name: 'master',
                permissions: [],
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
    it('builds the user from the introspection response', async () => {
        const { store, httpClient } = buildStore();

        store.setAccessToken('at-1');

        await store.resolve();

        // the endpoint resolves the subject server-side and answers with its
        // OpenID claims, so the dedicated userinfo round-trip is not made
        expect(countUserInfoRequests(httpClient)).toEqual(0);
        expect(store.user.value).toMatchObject({
            id: TOKEN_SUBJECT,
            name: 'admin',
        });
    });

    // A seeded user (raw seeding, the account console re-seeding from its
    // profile form) is only as trustworthy as its pairing with the token, and
    // the two drift apart: a sibling login on the same origin, an id left over
    // from a previous provisioning run. It is what the UI renders and what its
    // forms write against, so the commit overwrites it with the token's own
    // subject rather than carrying it for the app's lifetime.
    it('replaces a seeded user that is not the token subject', async () => {
        const { store, httpClient } = buildStore();

        store.setAccessToken('at-1');
        store.setUser({
            id: 'someone-else',
            name: 'stale',
        } as User);

        await store.resolve();

        expect(countUserInfoRequests(httpClient)).toEqual(0);
        expect(store.user.value).toMatchObject({
            id: TOKEN_SUBJECT,
            name: 'admin',
        });
    });

    // `/userinfo` resolves `@me` through the user service, which throws for a
    // client actor: fetching it took the whole resolve() down, and the guards
    // catch a rejected resolve() into a logout.
    it('holds no user for a non-user subject', async () => {
        const { store, httpClient } = buildStoreWithSubjectKind('client');

        store.setAccessToken('at-1');
        store.setUser({
            id: TOKEN_SUBJECT,
            name: 'admin',
        } as User);

        await store.resolve();

        expect(countUserInfoRequests(httpClient)).toEqual(0);
        expect(store.user.value).toBeNull();
    });
});
