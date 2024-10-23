/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { inject } from '../../inject';
import { provide } from '../../provide';
import type { StoreDispatcher } from './types';

const sym = Symbol.for('AuthupStoreEventBus');

export function injectStoreDispatcher(app?: App) : StoreDispatcher {
    const instance = inject<StoreDispatcher>(sym, app);
    if (!instance) {
        throw new Error('The store event bus has not been injected in the app context.');
    }

    return instance;
}

export function provideStoreDispatcher(eventBus: StoreDispatcher, app?: App) {
    provide(sym, eventBus, app);
}
