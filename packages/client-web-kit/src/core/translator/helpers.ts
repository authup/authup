/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GetContext } from 'ilingo';
import type { Ref } from 'vue';
import { useTranslation } from './singleton';

// Renamed from `group` to `namespace` in ilingo 6 to match the new
// descriptor-tree terminology. The exported function still uses the
// `useTranslationsForGroup` name so consumer call sites don't churn —
// the `group` parameter is the namespace name.
type Input = Omit<GetContext, 'namespace'>;
export function useTranslationsForGroup<T extends Input>(
    group: string,
    elements: T[],
): Record<`${T['key']}`, Ref<string>> {
    const output = {} as Record<string, Ref<string>>;
    for (const element of elements) {
        output[element.key] = useTranslation({
            ...element,
            namespace: group,
        });
    }

    return output;
}
