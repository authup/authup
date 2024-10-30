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
    ResourceEmitEvents,
    ResourceManager,
    ResourceManagerSlotProps,
} from './type';

export function buildEntityManagerSlotProps<T>(
    input: ResourceManager<T>,
) : ResourceManagerSlotProps<T> {
    return {
        ...input,
        error: unref(input.error),
        busy: unref(input.busy),
        data: unref(input.data),
        lockId: unref(input.lockId),
    };
}

export function defineEntityManagerEvents<T>(): ResourceEmitEvents<T> {
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

export function defineEntityManagerProps<T>() {
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
