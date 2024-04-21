/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { App } from 'vue';
import { inject as _inject, hasInjectionContext } from 'vue';

export function inject<T = any>(
    key: string | symbol,
    instance?: App,
) : T | undefined {
    if (
        instance &&
        instance._context &&
        instance._context.provides &&
        instance._context.provides[key]
    ) {
        return instance._context.provides[key];
    }

    if (hasInjectionContext()) {
        return _inject(key, undefined);
    }

    return undefined;
}
