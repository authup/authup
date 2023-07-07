/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { FiltersBuildInput } from 'rapiq';
import { unref } from 'vue';
import type { PropType } from 'vue/dist/vue';
import type {
    EntityManager,
    EntityManagerEventsType,
    EntityManagerRecord,
    EntityManagerSlotProps,
} from './type';

export function buildEntityManagerSlotProps<T extends EntityManagerRecord>(
    input: EntityManager<T>,
) : EntityManagerSlotProps<T> {
    return {
        ...input,
        busy: unref(input.busy),
        entity: unref(input.entity),
        lockId: unref(input.lockId),
    };
}

export function defineEntityManagerEvents<T extends EntityManagerRecord>(): EntityManagerEventsType<T> {
    return {
        failed: (_item: Error) => true,
        created: (_item: T) => true,
        deleted: (_item: T) => true,
        updated: (_item: Partial<T>) => true,
    };
}

export function defineEntityManagerProps<T extends EntityManagerRecord>() {
    return {
        entity: {
            type: Object as PropType<T>,
        },
        entityId: {
            type: String,
        },
        filters: {
            type: Object as PropType<FiltersBuildInput<T>>,
        },
    };
}
