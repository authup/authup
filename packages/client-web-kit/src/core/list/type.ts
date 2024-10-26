/*
 * Copyright (c) 2022-2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainTypeMap } from '@authup/core-kit';
import type {
    ListBodyBuildOptionsInput,
    ListBodySlotProps,
    ListFooterSlotProps,
    ListHeaderBuildOptionsInput,
    ListHeaderSlotProps,
    ListItemBuildOptionsInput,
    ListItemSlotProps,
    ListLoadFn,
    ListSlotProps,
} from '@vuecs/list-controls';
import type {
    BuildInput,
    FieldsBuildInput,
    FiltersBuildInput,
    ObjectLiteral,
    PaginationBuildInput,
    Parameter, RelationsBuildInput,
    SortBuildInput,
} from 'rapiq';
import type {
    MaybeRef,
    Ref, SetupContext, VNodeChild,
} from 'vue';
import type { EntitySocketContext } from '../entity-socket';
import type { EntityListSlotName } from './constants';

type Entity<T> = T extends Record<string, any> ? T : never;

export type ListMeta<T> = {
    total?: number,
    busy?: boolean,
    [Parameter.PAGINATION]?: PaginationBuildInput,
    [Parameter.FILTERS]?: FiltersBuildInput<T extends ObjectLiteral ? T : never>,
    [Parameter.SORT]?: SortBuildInput<T extends ObjectLiteral ? T : never>,
    [Parameter.FIELDS]?: FieldsBuildInput<T extends ObjectLiteral ? T : never>,
    [Parameter.RELATIONS]?: RelationsBuildInput<T extends ObjectLiteral ? T : never>
};

export type ListHeaderOptions<T> = {
    content?: ListHeaderBuildOptionsInput<T>['content'],
    tag?: ListHeaderBuildOptionsInput<T>['tag']
};
export type ListFooterOptions<T> = ListHeaderOptions<T>;
export type ListNoMoreOptions<T> = ListHeaderOptions<T>;
export type ListLoadingOptions<T> = ListHeaderOptions<T>;
export type ListItemOptions<T> = {
    content?: ListItemBuildOptionsInput<T>['content'],
    tag?: ListItemBuildOptionsInput<T>['tag']
};

export type ListBodyOptions<T> = {
    data?: ListBodyBuildOptionsInput<T>['data'],
    tag?: ListBodyBuildOptionsInput<T>['tag'],
    item?: ListItemOptions<T>
};

export type ListRenderOptions<T> = {
    header?: ListHeaderOptions<T> | boolean,
    body?: ListBodyOptions<T>,
    item?: ListItemOptions<T>,
    noMore?: ListNoMoreOptions<T> | boolean,
    footer?: ListFooterOptions<T> | boolean,
    loading?: ListLoadingOptions<T> | boolean
};

export type ListProps<T> = {
    realmId?: string,
    query?: BuildInput<Entity<T>>,
    loadOnSetup?: boolean,
} & ListRenderOptions<T>;

export type List<T> = {
    render(defaults?: ListRenderOptions<T>) : VNodeChild;
    load: ListLoadFn<ListMeta<T>>,
    handleCreated(item: T) : void;
    handleDeleted(item: T) : void;
    handleUpdated(item: T) : void;
    data: Ref<T[]>,
    busy: Ref<boolean>,
    meta: Ref<ListMeta<T>>,
    total: Ref<number>,
};

export type ListSlotsType<T> = {
    [EntityListSlotName.BODY]: ListBodySlotProps<T, ListMeta<T>>,
    [EntityListSlotName.DEFAULT]: ListSlotProps<T, ListMeta<T>>,
    [EntityListSlotName.ITEM]: ListItemSlotProps<T>, // todo: add generic
    [EntityListSlotName.ITEM_ACTIONS]: ListItemSlotProps<T>, // todo: add generic
    [EntityListSlotName.ITEM_ACTIONS_EXTRA]: ListItemSlotProps<T>, // todo: add generic
    [EntityListSlotName.HEADER]: ListHeaderSlotProps<T, ListMeta<T>>,
    [EntityListSlotName.FOOTER]: ListFooterSlotProps<T, ListMeta<T>>,
    [EntityListSlotName.NO_MORE]: undefined,
    [EntityListSlotName.LOADING]: undefined
};

export type ListEventsType<T> = {
    created: (item: T) => true,
    deleted: (item: T) => true,
    updated: (item: T) => true
};

export type ListCreateContext<
    A extends keyof DomainTypeMap,
    T = DomainTypeMap[A],
> = {
    type: A,
    realmId?: MaybeRef<string>,
    setup: SetupContext<ListEventsType<T>>,
    props: ListProps<T>,
    loadAll?: boolean,
    query?: BuildInput<Entity<T>> | (() => BuildInput<Entity<T>>),
    queryFilters?: ((q: string) => FiltersBuildInput<Entity<T>>),
    onCreated?: (entity: T, meta: ListMeta<T>) => void | Promise<void>,
    socket?: boolean | Omit<EntitySocketContext<A, T>, 'type'>
};
