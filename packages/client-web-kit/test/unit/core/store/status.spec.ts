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
        name_locked: false,
        first_name: null,
        last_name: null,
        display_name: null,
        email: 'admin@example.com',
        password: null,
        avatar: null,
        cover: null,
        reset_hash: null,
        reset_at: null,
        reset_expires: null,
        status: null,
        status_message: null,
        active: true,
        activate_hash: null,
        created_at: now,
        updated_at: now,
        realm_id: 'realm-1',
        realm: {
            id: 'realm-1',
            name: 'master',
            display_name: null,
            description: null,
            built_in: false,
            created_at: now,
            updated_at: now,
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
    exp: 9999999999,
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
            'GET /users/@me': () => ({ ...USER_RESPONSE }),
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
    it('starts anonymous with no origin', () => {
        const { store } = buildStore();

        expect(store.status.value).toEqual(StoreAuthStatus.ANONYMOUS);
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
            'GET /users/@me': () => {
                observed.push(store.status.value);
                return { ...USER_RESPONSE };
            },
        });

        await store.login({ name: 'admin', password: 'start123' });

        // every intermediate network step saw AUTHENTICATING — never a
        // half-built RESTORING/AUTHENTICATED
        expect(observed).toEqual([
            StoreAuthStatus.AUTHENTICATING,
            StoreAuthStatus.AUTHENTICATING,
            StoreAuthStatus.AUTHENTICATING,
        ]);
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(store.lastAuthOrigin.value).toEqual(StoreAuthOrigin.LOGIN);
    });

    it('returns to anonymous when the password grant fails', async () => {
        const { store } = buildStore({
            'POST /token': () => {
                throw new Error('grant failed');
            },
        });

        await expect(store.login({ name: 'admin', password: 'wrong' })).rejects.toThrow();

        expect(store.status.value).toEqual(StoreAuthStatus.ANONYMOUS);
        expect(store.lastAuthOrigin.value).toBeNull();
    });

    it('reads restoring after a login whose introspection failed (token without realm)', async () => {
        const { store } = buildStore({
            'POST /token/introspect': () => {
                throw new Error('introspection down');
            },
        });

        await expect(store.login({ name: 'admin', password: 'start123' })).rejects.toThrow();

        // the token was applied before resolution failed — presence-derived
        // status truthfully reports the half-built session (changes with the
        // plan-045 atomic commit)
        expect(store.status.value).toEqual(StoreAuthStatus.RESTORING);
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

    it('leaves origin null when an anonymous resolve() settles', async () => {
        const { store } = buildStore();

        await store.resolve();

        expect(store.status.value).toEqual(StoreAuthStatus.ANONYMOUS);
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

    it('resets to anonymous with no origin on logout', async () => {
        const { store } = buildStore();

        await store.login({ name: 'admin', password: 'start123' });
        expect(store.status.value).toEqual(StoreAuthStatus.AUTHENTICATED);

        await store.logout();

        expect(store.status.value).toEqual(StoreAuthStatus.ANONYMOUS);
        expect(store.lastAuthOrigin.value).toBeNull();
    });
});
