/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ListBodyBuildOptionsInput, ListFooterBuildOptionsInput, ListHeaderBuildOptionsInput } from '@vue-layout/list-controls';
import type { BuildInput } from 'rapiq';
import type { PropType } from 'vue';
import type { DomainListHeaderSearchOptionsInput, DomainListHeaderTitleOptionsInput } from '../../list-header';
import type { DomainListEventsType } from '../type';

export function defineDomainListEvents<T extends Record<string, any>>() : DomainListEventsType<T> {
    return {
        created: (item: T) => true,
        deleted: (item: T) => true,
        updated: (item: T) => true,
    };
}
export function defineDomainListProps<T extends Record<string, any>>() {
    return {
        loadOnSetup: {
            type: Boolean,
            default: true,
        },
        query: {
            type: Object as PropType<BuildInput<T>>,
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
            type: [Boolean, Object] as PropType<boolean | DomainListHeaderTitleOptionsInput>,
            default: true,
        },
        headerSearch: {
            type: [Boolean, Object] as PropType<boolean | DomainListHeaderSearchOptionsInput>,
            default: true,
        },
        body: {
            type: [Boolean, Object] as PropType<boolean | ListBodyBuildOptionsInput<T>>,
            default: true,
        },
    };
}
