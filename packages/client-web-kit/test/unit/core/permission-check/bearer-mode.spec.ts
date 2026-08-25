/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createFakeClient } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, defineStore } from 'pinia';
import { describe, expect, it } from 'vitest';
import type { Ref } from 'vue';
import { defineComponent, h } from 'vue';
import { createPermissionCheckerReactiveFn } from '../../../../src/core/permission-check';
import type { Store } from '../../../../src/core/store';
import { StoreAuthStatus, createStore, createStoreDispatcher } from '../../../../src/core/store';

/**
 * The other half of the loggedIn -> status swap: a bearer-mode login must
 * still re-evaluate a check mounted before the session landed, and a logout
 * must drop it back to the fail-closed default.
 */
describe('core/permission-check (bearer mode)', () => {
    function buildStore() : Store {
        const pinia = createPinia();
        const httpClient = createFakeClient({
            handlers: {
                'POST /token': () => ({
                    access_token: 'xyz',
                    token_type: 'Bearer',
                    expires_in: 3600,
                    refresh_token: 'abc',
                }),
                'POST /token/introspect': () => ({
                    active: true,
                    sub: 'user-1',
                    sub_kind: 'user',
                    name: 'admin',
                    realm_id: 'realm-1',
                    realm_name: 'master',
                    permissions: [{ name: 'user_read' }],
                }),
                'POST /token/revoke': () => ({}),
            },
        });

        const storeFactory = defineStore('auth-bearer-mode', () => createStore({
            httpClient,
            dispatcher: createStoreDispatcher(),
        }));

        return storeFactory(pinia);
    }

    it('should re-evaluate on login and fail closed again on logout', async () => {
        const store = buildStore();

        let outcome!: Ref<boolean>;
        mount(defineComponent({
            setup() {
                const checker = createPermissionCheckerReactiveFn({ store });
                outcome = checker({ name: 'user_read' });

                return () => h('div');
            },
        }));

        await flushPromises();
        expect(outcome.value).toBe(false);

        await store.login({ name: 'admin', password: 'secret' });
        await flushPromises();

        expect(store.status).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(outcome.value).toBe(true);

        await store.logout();
        await flushPromises();

        expect(store.status).toEqual(StoreAuthStatus.UNAUTHENTICATED);
        expect(outcome.value).toBe(false);
    });
});
