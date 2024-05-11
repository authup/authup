/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';
import { onMounted, onUnmounted, ref } from 'vue';
import { injectStore } from '../core';

export function useAbilityCheck(name: string) : Ref<boolean> {
    const { abilities } = injectStore();

    const data = ref(false);
    data.value = abilities.has(name);

    let removeListener : undefined | CallableFunction;
    onMounted(() => {
        removeListener = abilities.on('updated', () => {
            data.value = abilities.has(name);
        });
    });

    onUnmounted(() => {
        if (typeof removeListener !== 'undefined') {
            removeListener();
        }
    });

    return data;
}
