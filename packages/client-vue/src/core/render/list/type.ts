/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CollectionResourceResponse } from '@authup/core';
import type {
    ListBodyBuildOptionsInput, ListBodySlotProps, ListFooterBuildOptionsInput, ListFooterSlotProps, ListHeaderBuildOptionsInput,
    ListHeaderSlotProps, ListItemBuildOptionsInput, ListItemSlotProps, ListMeta,
    ListNoMoreBuildOptionsInput,
    SlotName,
} from '@vue-layout/list-controls';
import type { BuildInput, FiltersBuildInput } from 'rapiq';
import type {
    Ref, SetupContext, VNodeArrayChildren,
} from 'vue';
import type { DomainListFooterPaginationOptions } from '../list-footer';
import type {
    DomainListHeaderSearchOptionsInput,
    DomainListHeaderTitleOptionsInput,
} from '../list-header';

export type DomainListBuilderTemplateOptions<T extends Record<string, any>> = {
    header?: ListHeaderBuildOptionsInput<T> | boolean
    headerSearch?: DomainListHeaderSearchOptionsInput | boolean,
    headerTitle?: DomainListHeaderTitleOptionsInput | boolean,
    body?: ListBodyBuildOptionsInput<T> | boolean,
    item?: Omit<ListItemBuildOptionsInput<T>, 'data'>,
    noMore?: ListNoMoreBuildOptionsInput<T> | boolean,
    footer?: ListFooterBuildOptionsInput<T> | boolean,
    footerPagination?: DomainListFooterPaginationOptions | boolean
};

export type DomainListProps<T extends Record<string, any>> = {
    query?: BuildInput<T>,
    loadOnSetup?: boolean,
} & DomainListBuilderTemplateOptions<T>;

export type DomainListBuilderContext<T extends Record<string, any>> = {
    setup: SetupContext<DomainListEventsType<T>>,
    props: DomainListProps<T>,
    load: (input: BuildInput<T>) => Promise<CollectionResourceResponse<T>>,
    loadAll?: boolean,
    defaults: Partial<DomainListBuilderTemplateOptions<T>>,
    query?: BuildInput<T> | (() => BuildInput<T>),
    queryFilter?: FiltersBuildInput<T> | ((q: string) => FiltersBuildInput<T>)
};

export type DomainListBuilderOutput<T> = {
    build() : VNodeArrayChildren;
    load(meta: ListMeta) : Promise<void>,
    handleCreated(item: T) : void;
    handleDeleted(item: T) : void;
    handleUpdated(item: T) : void;
    data: Ref<T[]>,
    busy: Ref<boolean>,
    meta: Ref<ListMeta>
};

export type DomainListSlotsType<T extends Record<string, any>> = {
    [SlotName.BODY]?: ListBodySlotProps<T>,
    [SlotName.ITEM]?: ListItemSlotProps<T>,
    [SlotName.ITEM_ACTIONS]?: ListItemSlotProps<T>,
    [SlotName.ITEM_ACTIONS_EXTRA]?: ListItemSlotProps<T>,
    [SlotName.HEADER]?: ListHeaderSlotProps<T>,
    [SlotName.FOOTER]?: ListFooterSlotProps<T>
};

export type DomainListEventsType<T extends Record<string, any>> = {
    created: (item: T) => true,
    deleted: (item: T) => true,
    updated: (item: T) => true
};
