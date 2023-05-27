/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Ref } from 'vue';

type Fn = () => Promise<void>;
type OutputFn<T extends Fn> = (...args: Parameters<T>) => ReturnType<T> | Promise<void>;
export function wrapFnWithBusyState<T extends Fn>(
    busy: Ref<boolean>,
    fn: T,
): OutputFn<T> {
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
