/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';

type Fn = (...args: any[]) => Promise<void>;
type OutputFn = () => Promise<void>;
export function wrapFnWithBusyState(
    busy: Ref<boolean>,
    fn: Fn,
): OutputFn {
    return async () => {
        if (busy.value) {
            return Promise.resolve();
        }

        busy.value = true;

        return fn()
            .finally(() => {
                busy.value = false;
            });
    };
}
