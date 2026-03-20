/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { GetContext } from 'ilingo';
import type { Ref } from 'vue';
import { useTranslation } from './singleton';

type Input = Omit<GetContext, 'group'>;
export function useTranslationsForGroup<T extends Input>(
    group: string,
    elements: T[],
) : Record<`${T['key']}`, Ref<string>> {
    const output = {} as Record<string, Ref<string>>;
    for (const element of elements) {
        output[element.key] = useTranslation({
            ...element,
            group,
        });
    }

    return output;
}
