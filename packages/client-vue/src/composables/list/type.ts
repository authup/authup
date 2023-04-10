/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionResourceResponse } from '@authup/core';
import type {
    ListItemsBuildOptionsInput, ListLoadMeta, ListNoMoreBuildOptionsInput,
} from '@vue-layout/list-controls';
import type { PaginationOptionsInput } from '@vue-layout/pagination';
import type { BuildInput } from 'rapiq';
import type {
    Ref, SetupContext, ToRefs, VNodeArrayChildren,
} from 'vue';

export type ListBuilderComponentOptions<T extends Record<string, any>> = {
    header: boolean,
    search: boolean,
    items: ListItemsBuildOptionsInput<T> | boolean,
    noMore: ListNoMoreBuildOptionsInput<T>,
    pagination: PaginationOptionsInput | boolean
};

export type ListProps<T extends Record<string, any>> = {
    query: BuildInput<T>
    withHeader: boolean,
    withNoMore: boolean,
    withSearch: boolean,
    withPagination: boolean,
    loadOnSetup: boolean
};

export type DomainListBuilderContext<T extends Record<string, any>> = {
    setup: SetupContext<{deleted: (item: T) => true, updated: (item: T) => true}>,
    props: ToRefs<ListProps<T>>
    load: (input: BuildInput<T>) => Promise<CollectionResourceResponse<T>>,
    components: Partial<ListBuilderComponentOptions<T>>,
    filterKey?: string
};

export type DomainListBuilderOutput<T> = {
    build() : VNodeArrayChildren;
    load(meta: ListLoadMeta) : Promise<void>,
    data: Ref<T[]>,
    busy: Ref<boolean>,
    meta: Ref<ListLoadMeta>
};
