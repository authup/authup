/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainEntity, DomainType } from '@authup/core';
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
} from '@vue-layout/list-controls';
import type { BuildInput, FiltersBuildInput } from 'rapiq';
import type {
    MaybeRef,
    Ref, SetupContext, VNodeChild,
} from 'vue';
import type { EntitySocketContext } from '../entity-socket';
import type { EntityListSlotName } from './constants';
import type { EntityListFooterPaginationOptions } from './footer';
import type {
    EntityListHeaderSearchOptionsInput,
    EntityListHeaderTitleOptionsInput,
} from './header';

type Entity<T> = T extends Record<string, any> ? T : never;

export type EntityListMeta = {
    total: number,
    limit: number,
    offset: number
};

export type EntityListBuilderTemplateOptions<T> = {
    header?: ListHeaderBuildOptionsInput<T> | boolean
    headerSearch?: EntityListHeaderSearchOptionsInput | boolean,
    headerTitle?: EntityListHeaderTitleOptionsInput | boolean,
    body?: ListBodyBuildOptionsInput<T> | boolean,
    item?: Omit<ListItemBuildOptionsInput<T>, 'data'>,
    noMore?: ListNoMoreBuildOptionsInput<T> | boolean,
    footer?: ListFooterBuildOptionsInput<T> | boolean,
    footerPagination?: EntityListFooterPaginationOptions | boolean
};

export type EntityListProps<T> = {
    realmId?: string,
    query?: BuildInput<Entity<T>>,
    loadOnSetup?: boolean,
} & EntityListBuilderTemplateOptions<T>;

export type EntityList<T> = {
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

export type EntityListHeaderTitleSlotProps = {
    load: (value: string) => any,
    busy: boolean
};

export type EntityListSlotsType<T> = {
    [EntityListSlotName.BODY]: ListBodySlotProps<T>,
    [EntityListSlotName.ITEM]: ListItemSlotProps<T>,
    [EntityListSlotName.ITEM_ACTIONS]: ListItemSlotProps<T>,
    [EntityListSlotName.ITEM_ACTIONS_EXTRA]: ListItemSlotProps<T>,
    [EntityListSlotName.HEADER]: ListHeaderSlotProps<T>,
    [EntityListSlotName.HEADER_TITLE]: EntityListHeaderTitleSlotProps,
    [EntityListSlotName.HEADER_SEARCH]: undefined,
    [EntityListSlotName.FOOTER]: ListFooterSlotProps<T>
};

export type EntityListEventsType<T> = {
    created: (item: T) => true,
    deleted: (item: T) => true,
    updated: (item: T) => true
};

export type EntityListCreateContext<
    A extends `${DomainType}`,
    T = DomainEntity<A>,
> = {
    type: A,
    realmId?: MaybeRef<string>,
    setup: SetupContext<EntityListEventsType<T>>,
    props: EntityListProps<T>,
    loadAll?: boolean,
    query?: BuildInput<Entity<T>> | (() => BuildInput<Entity<T>>),
    queryFilters?: FiltersBuildInput<Entity<T>> | ((q: string) => FiltersBuildInput<Entity<T>>),
    onCreated?: (entity: T, meta: EntityListMeta) => void | Promise<void>,
    socket?: boolean | Omit<EntitySocketContext<A, T>, 'type'>
};
