/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isRealmResourceWritable } from '@authup/core-kit';
import { storeToRefs } from 'pinia';
import type { MaybeRef, Ref } from 'vue';
import { computed, unref } from 'vue';
import { injectStore } from '../core';

export function useRealmResourceWritableCheck(realmId?: MaybeRef<string>) : Ref<boolean> {
    const store = injectStore();
    const { realm } = storeToRefs(store);

    return computed(() => {
        const realmIdRaw = unref(realmId);

        return isRealmResourceWritable(realm.value, realmIdRaw);
    });
}
