/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';
import type { PropType } from 'vue';
import type {
    ListBodyOptions,
    ListFooterOptions, ListHeaderOptions, ListLoadingOptions, ListNoMoreOptions, ResourceCollectionVEmitOptions,
} from '../types';

export function defineResourceCollectionVEmitOptions<T>() : ResourceCollectionVEmitOptions<T> {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        created: (_item: T) => true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        deleted: (_item: T) => true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        updated: (_item: T) => true,
    };
}
export function defineResourceCollectionVProps<T>() {
    return {
        query: {
            type: Object as PropType<BuildInput<T extends Record<string, any> ? T : never>>,
            default() {
                return {};
            },
        },
        realmId: {
            type: String,
            default: undefined,
        },
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        loading: {
            type: [Boolean, Object] as PropType<boolean | ListLoadingOptions<T>>,
            default: true,
        },
        noMore: {
            type: [Boolean, Object] as PropType<boolean | ListNoMoreOptions<T>>,
            default: true,
        },
        footer: {
            type: [Boolean, Object] as PropType<boolean | ListFooterOptions<T>>,
            default: true,
        },
        header: {
            type: [Boolean, Object] as PropType<boolean | ListHeaderOptions<T>>,
            default: true,
        },
        body: {
            type: Object as PropType<ListBodyOptions<T>>,
        },
    };
}
