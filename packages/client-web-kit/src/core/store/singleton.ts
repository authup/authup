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
import { inject } from '../inject';
import { provide } from '../provide';
import type { createStore } from './module';

type StoreData = ReturnType<typeof createStore>;
export type Store = BaseStore<
string,
_ExtractStateFromSetupStore<StoreData>,
_ExtractGettersFromSetupStore<StoreData>,
_ExtractActionsFromSetupStore<StoreData>
>;

export const StoreSymbol = Symbol.for('AuthupStore');

export function injectStore(app?: App) : Store {
    const instance = inject<Store>(StoreSymbol, app);
    if (!instance) {
        throw new Error('The store has not been injected in the app context.');
    }

    return instance;
}

export function provideStore(store: Store, app?: App) {
    provide(StoreSymbol, store, app);
}
