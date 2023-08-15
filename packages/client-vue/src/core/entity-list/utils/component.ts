/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListBodyBuildOptionsInput, ListFooterBuildOptionsInput, ListHeaderBuildOptionsInput } from '@vue-layout/list-controls';
import type { BuildInput } from 'rapiq';
import type { PropType } from 'vue';
import type { EntityListHeaderSearchOptionsInput, EntityListHeaderTitleOptionsInput } from '../header';
import type { EntityListEventsType } from '../type';

export function defineDomainListEvents<T>() : EntityListEventsType<T> {
    return {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        created: (_item: T) => true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        deleted: (_item: T) => true,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        updated: (_item: T) => true,
    };
}
export function defineDomainListProps<T>() {
    return {
        realmId: {
            type: String,
            default: undefined,
        },
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<T extends Record<string, any> ? T : never>>,
            default() {
                return {};
            },
        },
        noMore: {
            type: Boolean,
            default: true,
        },
        footer: {
            type: [Boolean, Object] as PropType<boolean | ListFooterBuildOptionsInput<T>>,
            default: true,
        },
        footerPagination: {
            type: Boolean,
            default: true,
        },
        header: {
            type: [Boolean, Object] as PropType<boolean | ListHeaderBuildOptionsInput<T>>,
            default: true,
        },
        headerTitle: {
            type: [Boolean, Object] as PropType<boolean | EntityListHeaderTitleOptionsInput>,
            default: true,
        },
        headerSearch: {
            type: [Boolean, Object] as PropType<boolean | EntityListHeaderSearchOptionsInput>,
            default: true,
        },
        body: {
            type: [Boolean, Object] as PropType<boolean | ListBodyBuildOptionsInput<T>>,
            default: true,
        },
    };
}
