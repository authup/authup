/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionEvaluationContext } from '@authup/access';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { User } from '@authup/core-kit';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, defineStore, setActivePinia } from 'pinia';
import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import type { Ref } from 'vue';
import { defineComponent, h, ref } from 'vue';
import { usePermissionCheck, usePermissionCheckState } from '../../../../src/composables/index.ts';
import type { PermissionCheckState } from '../../../../src/core/permission-check/index.ts';
import { createStore, createStoreDispatcher, provideStoreFactory } from '../../../../src/core/store/index.ts';

const storeFactory = defineStore('auth-use-permission-check', () => createStore({
    httpClient: createFakeClient({ handlers: {} }),
    dispatcher: createStoreDispatcher(),
}));

/**
 * The verdict follows a reactive realm: granted for `realm-a` only.
 */
function mountWithGetter<T>(
    use: (ctx: () => PermissionEvaluationContext) => T,
    realmId: Ref<string>,
) : { result: () => T } {
    const pinia = createPinia();

    setActivePinia(pinia);

    const store = storeFactory(pinia);

    store.setUser({ id: 'user-id' } as User);

    vi.spyOn(store.permissionEvaluator, 'preEvaluateOneOf')
        .mockImplementation(async (ctx) => {
            if (ctx.realmId !== 'realm-a') {
                throw new Error('denied');
            }
        });

    let result!: T;

    const Child = defineComponent({
        setup() {
            // a getter, typed as one: no cast to the internal checker
            result = use(() => ({ name: 'realm_owned', realmId: realmId.value }));

            return () => h('div');
        },
    });

    mount(defineComponent({
        components: { Child },
        setup() {
            provideStoreFactory(storeFactory);

            return () => h(Child);
        },
    }), { global: { plugins: [pinia] } });

    return { result: () => result };
}

describe('composables/use-permission-check', () => {
    it('should re-evaluate usePermissionCheck when the getter changes', async () => {
        const realmId = ref('realm-a');
        const { result } = mountWithGetter<Ref<boolean>>((ctx) => usePermissionCheck(ctx), realmId);

        await flushPromises();
        expect(result().value).toBe(true);

        realmId.value = 'realm-b';
        await flushPromises();
        expect(result().value).toBe(false);
    });

    it('should re-evaluate usePermissionCheckState when the getter changes', async () => {
        const realmId = ref('realm-b');
        const { result } = mountWithGetter<PermissionCheckState>((ctx) => usePermissionCheckState(ctx), realmId);

        await flushPromises();
        expect(result().allowed.value).toBe(false);
        expect(result().settled.value).toBe(true);

        realmId.value = 'realm-a';
        await flushPromises();
        expect(result().allowed.value).toBe(true);
    });
});
