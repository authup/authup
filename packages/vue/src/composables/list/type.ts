/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { CollectionResourceResponse } from '@authelion/common';
import {
    ListHeaderBuildOptionsInput,
    ListItemsBuildOptionsInput,
    ListNoMoreBuildOptionsInput, ListPaginationBuildOptionsInput,
    ListSearchBuildOptionsInput,
} from '@vue-layout/hyperscript';
import { BuildInput } from 'rapiq';
import { SetupContext, Slots, ToRefs } from 'vue';

export type ListBuilderComponentOptions<T extends Record<string, any>> = {
    header: ListHeaderBuildOptionsInput | boolean,
    search: ListSearchBuildOptionsInput | boolean,
    items: ListItemsBuildOptionsInput<T> | boolean,
    noMore: ListNoMoreBuildOptionsInput<T> | boolean,
    pagination: ListPaginationBuildOptionsInput<T> | boolean
};

export type ListProps<T extends Record<string, any>> = {
    query: BuildInput<T>
    withHeader: boolean,
    withNoMore: boolean,
    withSearch: boolean,
    withPagination: boolean,
    loadOnSetup: boolean
};

export type ListBuilderContext<T extends Record<string, any>> = {
    setup: SetupContext<{deleted: (item: T) => true, updated: (item: T) => true}>,
    props: ToRefs<ListProps<T>>
    load: (input: BuildInput<T>) => Promise<CollectionResourceResponse<T>>,
    components: Partial<ListBuilderComponentOptions<T>>
};
