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
import { hasInjectionContext, inject, provide } from 'vue';
import type { createStore } from './module';

type StoreData = ReturnType<typeof createStore>;
export type Store = BaseStore<
string,
_ExtractStateFromSetupStore<StoreData>,
_ExtractGettersFromSetupStore<StoreData>,
_ExtractActionsFromSetupStore<StoreData>
>;

export const StoreSymbol = Symbol.for('AuthupStore');

export function isStoreInjected() {
    if (!hasInjectionContext()) {
        return false;
    }

    const instance = inject(StoreSymbol);
    return !!instance;
}
export function injectStore() : Store {
    const instance = inject(StoreSymbol);
    if (!instance) {
        throw new Error('The Store is not set.');
    }

    return instance as Store;
}

export function provideStore(store: Store, app?: App) {
    if (typeof app === 'undefined') {
        if (isStoreInjected()) {
            return;
        }

        provide(StoreSymbol, store);
        return;
    }
    if (
        app._context &&
        app._context.provides &&
        app._context.provides[StoreSymbol]
    ) {
        return;
    }

    app.provide(StoreSymbol, store);
}
