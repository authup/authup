/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionCheckerCheckContext, IdentityPolicyData } from '@authup/access';
import type { Ref } from 'vue';
import {
    onMounted, onUnmounted, ref, watch,
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

    return (ctx: PermissionCheckerCheckContext) : Ref<boolean> => {
        const data = ref(false);

        let computePromise: Promise<boolean> | undefined;
        const compute = async () => {
            if (computePromise) {
                return computePromise;
            }

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
                    identity.realmId = storeRefs.realmName.value;
                }
            }

            let outcome: boolean;

            try {
                computePromise = store.permissionChecker
                    .preCheckOneOf({
                        ...ctx,
                        input: {
                            ...(ctx.input || {}),
                            identity,
                        },
                    })
                    .then(() => true)
                    .catch(() => false);

                outcome = await computePromise;
            } catch (e) {
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
