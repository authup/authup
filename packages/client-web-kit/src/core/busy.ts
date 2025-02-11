/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';

type Fn = (...args: any[]) => Promise<void>;
type OutputFn<ARGS extends unknown[]> = (...args: ARGS) => Promise<void>;

export function wrapFnWithBusyState<T extends Fn = Fn>(
    busy: Ref<boolean>,
    fn: T,
): OutputFn<Parameters<T>> {
    return async (...args: Parameters<T>) => {
        if (busy.value) {
            return Promise.resolve();
        }

        busy.value = true;

        return fn(...args)
            .finally(() => {
                busy.value = false;
            });
    };
}
