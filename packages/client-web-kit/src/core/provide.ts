/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { provide as _provide } from 'vue';
import { inject } from './inject';

export function provide(
    key: string | symbol,
    value: unknown,
    app?: App,
) {
    if (typeof app === 'undefined') {
        const val = inject(key);
        if (typeof val !== 'undefined') {
            return;
        }

        _provide(key, value);

        return;
    }

    if (
        app &&
        app._context &&
        app._context.provides &&
        app._context.provides[key]
    ) {
        return;
    }

    app.provide(key, value);
}
