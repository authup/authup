/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ComputedRef, MaybeRef } from 'vue';
import { computed, isRef } from 'vue';

type ObjectLiteral = {
    id: any
};
export function useIsEditing<T extends ObjectLiteral>(input: MaybeRef<T | undefined>) : ComputedRef<boolean> {
    return computed(() => {
        if (isRef(input)) {
            return !!input.value && !!input.value.id;
        }

        return !!input && !!input.id;
    });
}
