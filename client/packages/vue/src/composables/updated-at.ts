/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ComputedRef, MaybeRef } from 'vue';
import { computed, isRef } from 'vue';

type ObjectLiteral = {
    updated_at: string | Date | undefined
};
export function useUpdatedAt<T extends ObjectLiteral>(input?: MaybeRef<T | undefined>) : ComputedRef<string | Date | undefined> {
    return computed(() => {
        if (isRef(input)) {
            return input.value ? input.value.updated_at : undefined;
        }

        return input ? input.updated_at : undefined;
    });
}
