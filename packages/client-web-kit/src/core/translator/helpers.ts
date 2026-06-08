/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GetContext } from 'ilingo';
import type { Ref } from 'vue';
import { reactive } from 'vue';
import { useTranslation } from './singleton';

type Input = Omit<GetContext, 'namespace'>;

/**
 * Resolve a batch of translations under a single namespace. Returns a
 * reactive keyed map of unwrapped strings — access as `map.key` (no
 * `.value`) in script, interpolation, and attribute bindings alike.
 */
export function useTranslationsForNamespace<T extends Input>(
    namespace: string,
    elements: T[],
): Record<`${T['key']}`, string> {
    const output = {} as Record<string, Ref<string>>;
    for (const element of elements) {
        output[element.key] = useTranslation({
            ...element,
            namespace,
        });
    }

    return reactive(output) as unknown as Record<`${T['key']}`, string>;
}
