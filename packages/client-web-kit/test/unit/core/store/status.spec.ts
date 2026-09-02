/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { User } from '@authup/core-kit';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { FakeHandler } from '@authup/core-http-kit/testing';
import { describe, expect, it } from 'vitest';
import {
    StoreAuthOrigin,
    StoreAuthStatus,
    createStore,
    createStoreDispatcher,
} from '../../../../src/core/store';

function buildUser() : User {
    const now = new Date(0).toISOString();

    return {
        id: 'user-1',
        name: 'admin',
        nameLocked: false,
        firstName: null,
        lastName: null,
        displayName: null,
        email: 'admin@example.com',
        emailVerified: false,
        password: null,
        avatar: null,
        cover: null,
        resetHash: null,
        resetAt: null,
        resetExpires: null,
        status: null,
        statusMessage: null,
        active: true,
        activateHash: null,
        createdAt: now,
        updatedAt: now,
        realmId: 'realm-1',
        realm: {
            id: 'realm-1',
            name: 'master',
            displayName: null,
            description: null,
            builtIn: false,
            createdAt: now,
            updatedAt: now,
        },
    };
}

const GRANT_RESPONSE = {
    access_token: 'at-1',
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'rt-1',
};

const INTROSPECTION_RESPONSE = {
    active: true,
    exp: 9999999999,
    // the endpoint resolves the subject and answers with its OpenID claims —
    // the store builds `user` out of these
    sub: 'user-1',
    sub_kind: 'user',
    name: 'admin',
    session_id: 'sess-1',
    realm_id: 'realm-1',
    realm_name: 'master',
    permissions: [],
};

const USER_RESPONSE = { id: 'user-1', name: 'admin' };

function buildStore(handlers: Record<string, FakeHandler> = {}) {
    const httpClient = createFakeClient({
        handlers: {
            'POST /token': () => ({ ...GRANT_RESPONSE }),
            'POST /token/introspect': () => ({ ...INTROSPECTION_RESPONSE }),
            'GET /userinfo': () => ({ ...USER_RESPONSE }),
            'POST /token/revoke': () => ({}),
            ...handlers,
        },
    });

    const store = createStore({
        httpClient,
        dispatcher: createStoreDispatcher(),
    });

    return { store, httpClient };
}

describe('core/store/status', () => {
    it('starts unauthenticated with no origin', () => {
        const { store } = buildStore();

        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.lastAuthOrigin.value).toBeNull();
    });

    it('reads authenticating for the whole duration of login(), then authenticated with origin login', async () => {
        const observed : string[] = [];
        const { store } = buildStore({
            'POST /token': () => {
                observed.push(store.status.value);
                return { ...GRANT_RESPONSE };
            },
            'POST /token/introspect': () => {
                observed.push(store.status.value);
                return { ...INTROSPECTION_RESPONSE };
            },
        });

        await store.login({ name: 'admin', password: 'start123' });

        // every intermediate network step saw AUTHENTICATING — never a
        // half-built RESTORING/AUTHENTICATED
        expect(observed).toEqual([
            StoreAuthStatus.AUTHENTICATING,
            StoreAuthStatus.AUTHENTICATING,
        ]);
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(store.lastAuthOrigin.value).toEqual(StoreAuthOrigin.LOGIN);
    });

    it('returns to unauthenticated when the password grant fails', async () => {
        const { store } = buildStore({
            'POST /token': () => {
                throw new Error('grant failed');
            },
        });

        await expect(store.login({ name: 'admin', password: 'wrong' })).rejects.toThrow();

        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.lastAuthOrigin.value).toBeNull();
    });

    it('returns to unauthenticated when introspection fails during login (atomic commit)', async () => {
        const { store } = buildStore({
            'POST /token/introspect': () => {
                throw new Error('introspection down');
            },
        });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow();

        // nothing was committed — no half-built RESTORING session remains
        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.accessToken.value).toBeNull();
        expect(store.lastAuthOrigin.value).toBeNull();
    });

    it('derives status from raw-setter seeding (presence, not internal flags)', () => {
        const { store } = buildStore();

        store.setAccessToken('at-1');
        expect(store.status.value).toEqual(StoreAuthStatus.RESTORING);

        store.setRealm({ id: 'realm-1', name: 'master' });
        expect(store.status.value).toEqual(StoreAuthStatus.RESTORING);

        store.setUser(buildUser());
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
    });

    it('reads restoring for a refresh-token-only store (session presence)', async () => {
        const { store } = buildStore();

        // the access-token cookie expires via maxAge, the refresh-token
        // cookie is a session cookie — an RT-only hydration is a normal
        // restorable state, not unauthenticated
        store.setRefreshToken('rt-1');
        expect(store.status.value).toEqual(StoreAuthStatus.RESTORING);

        await store.resolve();

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(store.lastAuthOrigin.value).toEqual(StoreAuthOrigin.RESTORE);
    });

    it('falls back to unauthenticated when the refresh-token-only restore fails', async () => {
        const { store } = buildStore({
            'POST /token': () => {
                throw new Error('invalid_grant');
            },
        });

        store.setRefreshToken('rt-1');
        expect(store.status.value).toEqual(StoreAuthStatus.RESTORING);

        await expect(store.resolve()).rejects.toThrow();

        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.lastAuthOrigin.value).toBeNull();
    });

    it('stamps origin restore when resolve() settles a seeded session', async () => {
        const { store } = buildStore();

        store.setAccessToken('at-1');

        await store.resolve();

        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(store.lastAuthOrigin.value).toEqual(StoreAuthOrigin.RESTORE);
    });

    it('never overwrites an interactive origin on a later resolve()', async () => {
        const { store } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });
        expect(store.lastAuthOrigin.value).toEqual(StoreAuthOrigin.LOGIN);

        await store.resolve();

        expect(store.lastAuthOrigin.value).toEqual(StoreAuthOrigin.LOGIN);
    });

    it('leaves origin null when an unauthenticated resolve() settles', async () => {
        const { store } = buildStore();

        await store.resolve();

        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.lastAuthOrigin.value).toBeNull();
    });

    it('reads authenticating during the code exchange, then authenticated with origin exchange', async () => {
        const observed : string[] = [];
        const { store } = buildStore({
            'POST /token': () => {
                observed.push(store.status.value);
                return { ...GRANT_RESPONSE };
            },
        });

        await store.exchangeAuthorizationCode('code-1');

        expect(observed).toEqual([StoreAuthStatus.AUTHENTICATING]);
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(store.lastAuthOrigin.value).toEqual(StoreAuthOrigin.EXCHANGE);
    });

    it('resets to unauthenticated with no origin on logout', async () => {
        const { store } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);

        await store.logout();

        expect(store.status.value).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(store.lastAuthOrigin.value).toBeNull();
    });
});
