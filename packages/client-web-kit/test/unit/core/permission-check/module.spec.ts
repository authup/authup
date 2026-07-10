/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData, PermissionEvaluationContext } from '@authup/access';
import { BuiltInPolicyType } from '@authup/access';
import { createFakeClient } from '@authup/core-http-kit/testing';
import type { User } from '@authup/core-kit';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, defineStore } from 'pinia';
import { 
    describe, 
    expect, 
    it, 
    vi, 
} from 'vitest';
import type { Ref } from 'vue';
import { defineComponent, h } from 'vue';
import { createPermissionCheckerReactiveFn } from '../../../../src/core/permission-check';
import type { Store } from '../../../../src/core/store';
import { createStore, createStoreDispatcher } from '../../../../src/core/store';

function buildStore() : Store {
    const pinia = createPinia();
    const storeFactory = defineStore('auth-test', () => createStore({
        httpClient: createFakeClient({ handlers: {} }),
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

describe('core/permission-check', () => {
    it('should keep realm id and realm name on distinct identity fields', async () => {
        const store = buildStore();
        store.setUser({ id: 'user-id' } as User);
        store.setRealm({ id: 'realm-id', name: 'master' });

        const spy = vi.spyOn(store.permissionEvaluator, 'preEvaluateOneOf')
            .mockResolvedValue(undefined);

        const outcome = await runCheck(store, { name: 'user_read' });

        expect(spy).toHaveBeenCalledTimes(1);

        const [evaluationContext] = spy.mock.calls[0];
        expect(evaluationContext.data).toBeDefined();

        const identity = evaluationContext.data!
            .get<IdentityPolicyData>(BuiltInPolicyType.IDENTITY);
        expect(identity).toEqual({
            type: 'user',
            id: 'user-id',
            realmId: 'realm-id',
            realmName: 'master',
        });

        expect(outcome.value).toBe(true);
    });

    it('should omit realm fields when the store has no realm', async () => {
        const store = buildStore();
        store.setUser({ id: 'user-id' } as User);

        const spy = vi.spyOn(store.permissionEvaluator, 'preEvaluateOneOf')
            .mockResolvedValue(undefined);

        await runCheck(store, { name: 'user_read' });

        expect(spy).toHaveBeenCalledTimes(1);

        const [evaluationContext] = spy.mock.calls[0];
        const identity = evaluationContext.data!
            .get<IdentityPolicyData>(BuiltInPolicyType.IDENTITY);
        expect(identity).toEqual({
            type: 'user',
            id: 'user-id',
        });
    });
});
