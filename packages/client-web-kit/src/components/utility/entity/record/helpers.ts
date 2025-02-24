/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput, FieldsBuildInput, FiltersBuildInput } from 'rapiq';
import { unref } from 'vue';
import type { PropType } from 'vue';
import type {
    EntityManager,
    EntityVEmitOptions,
    EntityVSlotProps,
} from './types';

export function buildEntityVSlotProps<T>(
    input: EntityManager<T>,
) : EntityVSlotProps<T> {
    return {
        ...input,
        error: unref(input.error),
        busy: unref(input.busy),
        data: unref(input.data),
        lockId: unref(input.lockId),
    };
}

export function defineEntityVEmitOptions<T>(): EntityVEmitOptions<T> {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        failed: (_item: Error) => true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        created: (_item: T) => true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        deleted: (_item: T) => true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        updated: (_item: T) => true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        resolved: (_item?: T) => true,
    };
}

export function defineEntityVProps<T>() {
    return {
        entity: {
            type: Object as PropType<T>,
        },
        entityId: {
            type: String,
        },
        queryFilters: {
            type: Object as PropType<FiltersBuildInput<T extends Record<string, any> ? T : never>>,
        },
        queryFields: {
            type: Object as PropType<FieldsBuildInput<T extends Record<string, any> ? T : never>>,
        },
        query: {
            type: Object as PropType<T extends Record<string, any> ? BuildInput<T> : never>,
        },
    };
}
