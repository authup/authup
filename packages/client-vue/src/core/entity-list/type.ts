/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    ListBodyBuildOptionsInput,
    ListBodySlotProps,
    ListFooterBuildOptionsInput,
    ListFooterSlotProps,
    ListHeaderBuildOptionsInput,
    ListHeaderSlotProps,
    ListItemBuildOptionsInput,
    ListItemSlotProps,
    ListMeta,
    ListNoMoreBuildOptionsInput,
    SlotName,
} from '@vue-layout/list-controls';
import type { BuildInput, FiltersBuildInput } from 'rapiq';
import type {
    Ref, SetupContext, VNodeChild,
} from 'vue';
import type { EntityListFooterPaginationOptions } from './footer';
import type {
    EntityListHeaderSearchOptionsInput,
    EntityListHeaderTitleOptionsInput,
} from './header';

export type EntityListRecord = {
    [key: string]: any,
    id: any
};

export type EntityListMeta = {
    total: number,
    limit: number,
    offset: number
};

export type EntityListBuilderTemplateOptions<T extends Record<string, any>> = {
    header?: ListHeaderBuildOptionsInput<T> | boolean
    headerSearch?: EntityListHeaderSearchOptionsInput | boolean,
    headerTitle?: EntityListHeaderTitleOptionsInput | boolean,
    body?: ListBodyBuildOptionsInput<T> | boolean,
    item?: Omit<ListItemBuildOptionsInput<T>, 'data'>,
    noMore?: ListNoMoreBuildOptionsInput<T> | boolean,
    footer?: ListFooterBuildOptionsInput<T> | boolean,
    footerPagination?: EntityListFooterPaginationOptions | boolean
};

export type EntityListProps<T extends Record<string, any>> = {
    query?: BuildInput<T>,
    loadOnSetup?: boolean,
} & EntityListBuilderTemplateOptions<T>;

export type EntityListCreateContext<T extends Record<string, any>> = {
    setup: SetupContext<EntityListEventsType<T>>,
    props: EntityListProps<T>,
    loadAll?: boolean,
    query?: BuildInput<T> | (() => BuildInput<T>),
    queryFilter?: FiltersBuildInput<T> | ((q: string) => FiltersBuildInput<T>)
};

export type EntityListCreateOutput<T extends Record<string, any>> = {
    render() : VNodeChild;
    load(meta: ListMeta) : Promise<void>,
    handleCreated(item: T) : void;
    handleDeleted(item: T) : void;
    handleUpdated(item: T) : void;
    setDefaults(defaults: EntityListBuilderTemplateOptions<T>) : void,
    data: Ref<T[]>,
    busy: Ref<boolean>,
    meta: Ref<ListMeta>
};

export type EntityListSlotsType<T extends Record<string, any>> = {
    [SlotName.BODY]?: ListBodySlotProps<T>,
    [SlotName.ITEM]?: ListItemSlotProps<T>,
    [SlotName.ITEM_ACTIONS]?: ListItemSlotProps<T>,
    [SlotName.ITEM_ACTIONS_EXTRA]?: ListItemSlotProps<T>,
    [SlotName.HEADER]?: ListHeaderSlotProps<T>,
    [SlotName.FOOTER]?: ListFooterSlotProps<T>
};

export type EntityListEventsType<T extends Record<string, any>> = {
    created: (item: T) => true,
    deleted: (item: T) => true,
    updated: (item: T) => true
};
