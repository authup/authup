/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';
import { onMounted, onUnmounted, ref } from 'vue';
import { useStore } from '../core';

export function useAbilityCheck(name: string) : Ref<boolean> {
    const { abilities } = useStore();

    const data = ref(false);

    abilities.has(name)
        .then((outcome) => {
            data.value = outcome;
        });

    let removeListener : undefined | CallableFunction;
    onMounted(() => {
        removeListener = abilities.on('updated', () => {
            abilities.has(name)
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
