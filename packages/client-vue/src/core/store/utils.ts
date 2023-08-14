/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Store as BaseStore,
    _ExtractActionsFromSetupStore,
    _ExtractGettersFromSetupStore,
    _ExtractStateFromSetupStore,
} from 'pinia';
import type { App } from 'vue';
import { inject, provide } from 'vue';
import type { createStore } from './module';

type StoreData = ReturnType<typeof createStore>;
export type Store = BaseStore<
string,
_ExtractStateFromSetupStore<StoreData>,
_ExtractGettersFromSetupStore<StoreData>,
_ExtractActionsFromSetupStore<StoreData>
>;

const symbol = Symbol.for('AStore');
export function injectStore() : Store {
    const instance = inject(symbol);
    if (!instance) {
        throw new Error('The Store is not set.');
    }

    return instance as Store;
}

export function provideStore(store: Store, instance?: App) {
    if (instance) {
        instance.provide(symbol, store);
        return;
    }

    provide(symbol, store);
}
