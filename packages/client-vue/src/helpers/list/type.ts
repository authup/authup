/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionResourceResponse } from '@authup/core';
import type {
    ListItemsBuildOptionsInput,
    ListLoadMeta,
    ListNoMoreBuildOptionsInput,
} from '@vue-layout/list-controls';
import type { BuildInput } from 'rapiq';
import type {
    Ref, SetupContext, ToRefs, VNodeArrayChildren,
} from 'vue';
import type { DomainListFooterPaginationOptions } from '../list-footer';
import type {
    DomainListHeaderSearchOptionsInput,
    DomainListHeaderTitleOptionsInput,
} from '../list-header';

export type DomainListBuilderTemplateOptions<T extends Record<string, any>> = {
    headerSearch?: DomainListHeaderSearchOptionsInput | boolean,
    headerTitle?: DomainListHeaderTitleOptionsInput | boolean,
    items?: ListItemsBuildOptionsInput<T> | boolean,
    noMore?: ListNoMoreBuildOptionsInput<T> | boolean,
    footerPagination?: DomainListFooterPaginationOptions | boolean
};

export type DomainListProps<T extends Record<string, any>> = {
    query: BuildInput<T>,
    loadOnSetup: boolean
} & DomainListBuilderTemplateOptions<T>;

export type DomainListBuilderContext<T extends Record<string, any>> = {
    setup: SetupContext<{deleted: (item: T) => true, updated: (item: T) => true}>,
    props: ToRefs<DomainListProps<T>>
    load: (input: BuildInput<T>) => Promise<CollectionResourceResponse<T>>,
    defaults: Partial<DomainListBuilderTemplateOptions<T>>,
    filterKey?: string
};

export type DomainListBuilderOutput<T> = {
    build() : VNodeArrayChildren;
    load(meta: ListLoadMeta) : Promise<void>,
    data: Ref<T[]>,
    busy: Ref<boolean>,
    meta: Ref<ListLoadMeta>
};
