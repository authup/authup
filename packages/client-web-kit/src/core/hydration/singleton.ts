/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { inject } from '../inject';
import { provide } from '../provide';
import type { HydrationStore } from './types';

export const HydrationStoreSymbol = Symbol.for('AuthupHydrationStore');

export function provideHydrationStore(store: HydrationStore, app?: App) {
    provide(HydrationStoreSymbol, store, app);
}

/**
 * The host's hydration bucket, or undefined when the host provides none.
 * Optional by design: a consumer without server rendering never installs one.
 */
export function injectHydrationStore(app?: App) : HydrationStore | undefined {
    return inject<HydrationStore>(HydrationStoreSymbol, app);
}
