/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionEvaluationContext } from '@authup/access';
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { createFakeClient } from '@authup/core-http-kit/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, defineStore } from 'pinia';
import { describe, expect, it } from 'vitest';
import type { Ref } from 'vue';
import { defineComponent, h } from 'vue';
import { createPermissionCheckerReactiveFn } from '../../../../src/core/permission-check';
import type { Store } from '../../../../src/core/store';
import { StoreAuthStatus, createStore, createStoreDispatcher } from '../../../../src/core/store';
import {
    AUTHORIZATION_REALM,
    AUTHORIZATION_SUBJECT,
    buildAuthorizationCheck,
    buildAuthorizationGrants,
} from '../../../utils/authorization';

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
                    sub: AUTHORIZATION_SUBJECT,
                    sub_kind: 'user',
                    name: 'admin',
                    realm_id: AUTHORIZATION_REALM,
                    realm_name: 'master',
                    permissions: buildAuthorizationGrants(),
                }),
                'POST /authorization/check': () => buildAuthorizationCheck(),
                'POST /token/revoke': () => ({}),
            },
        });

        const storeFactory = defineStore('auth-bearer-mode', () => createStore({
            httpClient,
            dispatcher: createStoreDispatcher(),
        }));

        return storeFactory(pinia);
    }

    async function runCheck(store: Store, ctx: PermissionEvaluationContext) : Promise<Ref<boolean>> {
        let outcome!: Ref<boolean>;

        mount(defineComponent({
            setup() {
                const checker = createPermissionCheckerReactiveFn({ store });
                outcome = checker(ctx);

                return () => h('div');
            },
        }));

        await flushPromises();

        return outcome;
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

    it('settles reach per row when the check carries the row realm', async () => {
        const store = buildStore();
        await store.login({ name: 'admin', password: 'start123' });

        const own = await runCheck(store, {
            name: 'user_read',
            data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: AUTHORIZATION_REALM }),
        });
        const foreign = await runCheck(store, {
            name: 'user_read',
            data: new PolicyData({ [BuiltInPolicyType.REALM_MATCH]: 'realm-2' }),
        });
        const unknown = await runCheck(store, { name: 'user_read' });

        expect(own.value).toBe(true);
        expect(foreign.value).toBe(false);
        expect(unknown.value).toBe(true);
    });
});
