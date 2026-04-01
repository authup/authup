/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { StoreGeneric, storeToRefs as _storeToRefs } from 'pinia';
import {
    isReactive, 
    isRef, 
    toRaw, 
    toRef,
} from 'vue';

export type StoreToRefs<T extends StoreGeneric> = ReturnType<typeof _storeToRefs<T>>;

export function storeToRefs<SS extends StoreGeneric>(
    store: SS,
): StoreToRefs<SS> {
    store = toRaw(store);

    const refs = {} as StoreToRefs<SS>;
    const keys = Object.keys(store);
    for (const key of keys) {
        const value = store[key];
        if (isRef(value) || isReactive(value)) {
            refs[key as (keyof StoreToRefs<SS>)] = toRef(store, key) as any;
        }
    }

    return refs;
}
