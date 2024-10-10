/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { StoreGeneric, storeToRefs as _storeToRefs } from 'pinia';
import {
    isReactive, isRef, toRaw, toRef,
} from 'vue';

export type StoreToRefs<T extends StoreGeneric> = ReturnType<typeof _storeToRefs<T>>;

export function storeToRefs<SS extends StoreGeneric>(
    store: SS,
): StoreToRefs<SS> {
    store = toRaw(store);

    const refs = {} as StoreToRefs<SS>;
    const keys = Object.keys(store);
    for (let i = 0; i < keys.length; i++) {
        const value = store[keys[i]];
        if (isRef(value) || isReactive(value)) {
            refs[keys[i] as (keyof StoreToRefs<SS>)] = toRef(store, keys[i]) as any;
        }
    }

    return refs;
}
