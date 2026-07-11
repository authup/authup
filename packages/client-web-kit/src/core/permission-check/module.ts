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
    watch,
} from 'vue';
import type { Store } from '../store';
import { injectStore, storeToRefs } from '../store';
import type {
    PermissionCheckerReactiveFn,
    PermissionCheckerReactiveFnContext,
    PermissionCheckerReactiveFnCreateContext,
} from './types';

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

    // The returned fn registers lifecycle hooks — call it ONCE during setup.
    // Pass a GETTER to make the evaluation context reactive: the checker
    // re-evaluates whenever the getter's dependencies (e.g. component props)
    // change, in addition to the login-state changes it always tracks.
    return (ctx: PermissionCheckerReactiveFnContext) : Ref<boolean> => {
        const resolveContext : () => PermissionEvaluationContext = typeof ctx === 'function' ?
            ctx :
            () => ctx;

        const data = ref(false);

        // guards a recompute triggered while an earlier evaluation is still
        // in flight — only the latest evaluation may write the outcome (the
        // stale one ran against a superseded context or login state).
        let sequence = 0;

        const compute = async () => {
            let identity: IdentityPolicyData | undefined;
            if (storeRefs.userId.value) {
                identity = {
                    type: 'user',
                    id: storeRefs.userId.value,
                };

                if (storeRefs.realmId.value) {
                    identity.realmId = storeRefs.realmId.value;
                }

                if (storeRefs.realmName.value) {
                    identity.realmName = storeRefs.realmName.value;
                }
            }

            const evaluationContext = resolveContext();

            const input = evaluationContext.data || new PolicyData();
            input.set(BuiltInPolicyType.IDENTITY, identity);

            try {
                return await store.permissionEvaluator
                    .preEvaluateOneOf({
                        ...evaluationContext,
                        data: input,
                    })
                    .then(() => true)
                    .catch(() => false);
            } catch {
                return false;
            }
        };

        const recompute = () => {
            sequence++;
            const current = sequence;

            Promise.resolve()
                .then(() => compute())
                .then((outcome) => {
                    if (current === sequence) {
                        data.value = outcome;
                    }
                });
        };

        recompute();

        let removeListener: undefined | CallableFunction;
        onMounted(() => {
            removeListener = watch(
                [storeRefs.loggedIn, resolveContext],
                () => recompute(),
            );
        });

        onUnmounted(() => {
            if (typeof removeListener !== 'undefined') {
                removeListener();
            }
        });

        return data;
    };
}
