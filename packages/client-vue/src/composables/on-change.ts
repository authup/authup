/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { watch } from 'vue';
import type { Ref } from 'vue';

export function onChange<T>(input: Ref<T>, fn: (item: T) => any) {
    watch(input, (val, oldValue) => {
        if (val !== oldValue) {
            fn(val);
        }
    }, { deep: true });
}
