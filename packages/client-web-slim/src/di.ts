/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { inject, provide } from 'vue';
import type { App } from 'vue';
import type { HydrationPayload } from './types';

const HYDRATION_PAYLOAD = Symbol.for('HYDRATION_PAYLOAD');

export function providePayload<T extends Record<string, any>>(payload: HydrationPayload<T>, app?: App) {
    if (app) {
        app.provide(HYDRATION_PAYLOAD, payload);
        return;
    }

    provide(HYDRATION_PAYLOAD, payload);
}

export function injectPayload<T extends Record<string, any>>() : HydrationPayload<T> {
    return inject(HYDRATION_PAYLOAD);
}
