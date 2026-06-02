/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityPolicyData, PermissionEvaluationContext } from '@authup/access';
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import type { Ref } from 'vue';
import {
    onMounted,
    onUnmounted,
    ref,
    unref,
    watch,
} from 'vue';
import type { Store } from '../store';
import { injectStore, storeToRefs } from '../store';
import type { PermissionCheckerReactiveFn, PermissionCheckerReactiveFnCreateContext } from './types';

export function createPermissionCheckerReactiveFn(
    ctx: PermissionCheckerReactiveFnCreateContext = {},
) : PermissionCheckerReactiveFn {
    let store : Store;
    if (ctx.store) {
        store = ctx.store;
    } else {
        store = injectStore(ctx.pinia, ctx.app);
    }

    const storeRefs = storeToRefs(store);

    return (ctx: PermissionEvaluationContext) : Ref<boolean> => {
        const data = ref(false);

        let computePromise: Promise<boolean> | undefined;
        const compute = async () => {
            if (computePromise) {
                return computePromise;
            }

            // `unref()` collapses the Pinia 3 / Vue 3.5 double-ref-wrap on
            // computed-getter access via `storeToRefs`. Same pattern as
            // authentication-hook/install.ts; runtime stays unchanged.
            const userId = unref(storeRefs.userId.value) as string | null;
            const realmId = unref(storeRefs.realmId.value) as string | null;
            const realmName = unref(storeRefs.realmName.value) as string | null;

            let identity: IdentityPolicyData | undefined;
            if (userId) {
                identity = {
                    type: 'user',
                    id: userId,
                };

                if (realmId) {
                    identity.realmId = realmId;
                }

                if (realmName) {
                    identity.realmId = realmName;
                }
            }

            let outcome: boolean;

            const input = ctx.input || new PolicyData();
            input.set(BuiltInPolicyType.IDENTITY, identity);

            try {
                computePromise = store.permissionEvaluator
                    .preEvaluateOneOf({
                        ...ctx,
                        input,
                    })
                    .then(() => true)
                    .catch(() => false);

                outcome = await computePromise;
            } catch {
                outcome = false;
            } finally {
                computePromise = undefined;
            }

            return outcome;
        };

        Promise.resolve()
            .then(() => compute())
            .then((outcome) => {
                data.value = outcome;
            });

        let removeListener: undefined | CallableFunction;
        onMounted(() => {
            removeListener = watch(storeRefs.loggedIn, () => {
                Promise.resolve()
                    .then(() => compute())
                    .then((outcome) => {
                        data.value = outcome;
                    });
            });
        });

        onUnmounted(() => {
            if (typeof removeListener !== 'undefined') {
                removeListener();
            }
        });

        return data;
    };
}
