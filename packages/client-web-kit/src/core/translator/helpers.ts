/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GetContext } from 'ilingo';
import type { Ref } from 'vue';
import { useTranslation } from './singleton';

type Input = Omit<GetContext, 'namespace'>;

/**
 * Resolve a batch of translations under a single namespace. Returns a
 * keyed map of `Ref<string>`s, one per element.
 *
 * Naming aligned with ilingo 6's descriptor-tree terminology
 * (namespaces, not groups). The deprecated `useTranslationsForGroup`
 * alias below is kept for one minor so consumer call sites can rename
 * at their own pace.
 */
export function useTranslationsForNamespace<T extends Input>(
    namespace: string,
    elements: T[],
): Record<`${T['key']}`, Ref<string>> {
    const output = {} as Record<string, Ref<string>>;
    for (const element of elements) {
        output[element.key] = useTranslation({
            ...element,
            namespace,
        });
    }

    return output;
}

/**
 * @deprecated Renamed to `useTranslationsForNamespace` to match
 * ilingo 6's terminology. Drop in the next minor.
 */
export const useTranslationsForGroup = useTranslationsForNamespace;
