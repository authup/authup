/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';
import {
    onMounted, onUnmounted, ref, watch,
} from 'vue';
import { storeToRefs, useStore } from '../core';

export function useAbilityCheck(name: string) : Ref<boolean> {
    const store = useStore();
    const refs = storeToRefs(store);

    const data = ref(false);

    let computePromise : Promise<boolean> | undefined;
    const compute = async () => {
        if (computePromise) {
            return computePromise;
        }

        let outcome : boolean;

        try {
            computePromise = store.permissionManager.has(name);
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

    let removeListener : undefined | CallableFunction;
    onMounted(() => {
        removeListener = watch(refs.loggedIn, () => {
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
}
