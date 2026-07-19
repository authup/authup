/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ComputedRef, MaybeRefOrGetter } from 'vue';
import { computed, toValue } from 'vue';

type ObjectLiteral = {
    updatedAt: string | Date | undefined
};

/**
 * Track an entity's `updatedAt`. Pass a ref or getter
 * (e.g. `() => props.entity`) — a plain value is accepted but yields a
 * static computed: reading `props.entity` at the call site captures the
 * object once, so a later prop replacement never triggers watchers.
 */
export function useUpdatedAt<T extends ObjectLiteral>(input?: MaybeRefOrGetter<T | null | undefined>) : ComputedRef<string | Date | undefined> {
    return computed(() => {
        const value = toValue(input);

        return value ? value.updatedAt : undefined;
    });
}
