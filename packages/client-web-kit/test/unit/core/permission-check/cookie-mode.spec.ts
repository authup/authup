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
 * Plan 088 Stage 2. In cookie mode the store never holds an access token, so
 * a check that re-evaluates on the token-derived `loggedIn` flag latches at
 * its fail-closed default forever: the session lands (permissions included),
 * and every gated control stays disabled.
 */
describe('core/permission-check (cookie mode)', () => {
    function buildStore() : Store {
        const pinia = createPinia();
        const httpClient = createFakeClient({
            handlers: {
                'GET /sessions/@me/introspect': () => ({
                    active: true,
                    sub: 'user-1',
                    sub_kind: 'user',
                    name: 'admin',
                    session_id: 'sess-1',
                    realm_id: 'realm-1',
                    realm_name: 'master',
                    scope: 'global openid',
                    permissions: [{ name: 'user_read' }],
                }),
            },
        });

        const storeFactory = defineStore('auth-cookie-mode', () => createStore({
            httpClient,
            dispatcher: createStoreDispatcher(),
            cookieSession: true,
        }));

        return storeFactory(pinia);
    }

    it('should re-evaluate once the cookie session has landed', async () => {
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

        // mounted before the session resolved: fail closed
        expect(outcome.value).toBe(false);
        expect(store.status).toEqual(StoreAuthStatus.UNAUTHENTICATED);

        await store.resolve();
        await flushPromises();

        expect(store.status).toEqual(StoreAuthStatus.AUTHENTICATED);
        expect(store.accessToken).toBeNull();
        expect(outcome.value).toBe(true);
    });
});
