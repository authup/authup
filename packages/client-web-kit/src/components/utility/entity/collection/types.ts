/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

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
    BuildParameterInput,
    FiltersBuildInput,
    Parameter,
} from 'rapiq';
import type {
    MaybeRef,
    Ref, SetupContext, VNodeChild,
} from 'vue';
import type { EntitySocketManagerCreateContext } from '../socket';
import type { EntityCollectionSlotName } from './constants';

type Entity<T> = T extends Record<string, any> ? T : never;

export type ListMeta<T extends Record<string, any>> = {
    total?: number,
    busy?: boolean
} & {
    [K in Parameter as `${K}`]?: BuildParameterInput<K, T>
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

export type EntityCollectionRenderOptions<T> = {
    header?: ListHeaderOptions<T> | boolean,
    body?: ListBodyOptions<T>,
    item?: ListItemOptions<T>,
    noMore?: ListNoMoreOptions<T> | boolean,
    footer?: ListFooterOptions<T> | boolean,
    loading?: ListLoadingOptions<T> | boolean
};

export type EntityCollectionVProps<T> = {
    realmId?: string,
    query?: BuildInput<Entity<T>>,
    loadOnSetup?: boolean,
} & EntityCollectionRenderOptions<T>;

export type EntityCollectionManager<T extends Record<string, any>> = {
    render(defaults?: EntityCollectionRenderOptions<T>) : VNodeChild;
    load: ListLoadFn<ListMeta<T>>,
    handleCreated(item: T) : void;
    handleDeleted(item: T) : void;
    handleUpdated(item: T) : void;
    data: Ref<T[]>,
    busy: Ref<boolean>,
    meta: Ref<ListMeta<T>>,
    total: Ref<number>,
};

export type EntityCollectionVSlots<T extends Record<string, any>> = {
    [EntityCollectionSlotName.BODY]: ListBodySlotProps<T, ListMeta<T>>,
    [EntityCollectionSlotName.DEFAULT]: ListSlotProps<T, ListMeta<T>>,
    [EntityCollectionSlotName.ITEM]: ListItemSlotProps<T>, // todo: add generic
    [EntityCollectionSlotName.ITEM_ACTIONS]: ListItemSlotProps<T>, // todo: add generic
    [EntityCollectionSlotName.ITEM_ACTIONS_EXTRA]: ListItemSlotProps<T>, // todo: add generic
    [EntityCollectionSlotName.HEADER]: ListHeaderSlotProps<T, ListMeta<T>>,
    [EntityCollectionSlotName.FOOTER]: ListFooterSlotProps<T, ListMeta<T>>,
    [EntityCollectionSlotName.NO_MORE]: undefined,
    [EntityCollectionSlotName.LOADING]: undefined
};

export type EntityCollectionVEmitOptions<T> = {
    created: (item: T) => true,
    deleted: (item: T) => true,
    updated: (item: T) => true
};

export type EntityCollectionManagerCreateContext<
    TYPE extends string,
    RECORD extends Record<string, any>,
> = {
    type: TYPE,
    realmId?: MaybeRef<string>,
    setup: SetupContext<EntityCollectionVEmitOptions<RECORD>>,
    props: EntityCollectionVProps<RECORD>,
    loadAll?: boolean,
    query?: BuildInput<Entity<RECORD>> | (() => BuildInput<Entity<RECORD>>),
    queryFilters?: ((q: string) => FiltersBuildInput<Entity<RECORD>>),
    onCreated?: (entity: RECORD, meta: ListMeta<RECORD>) => void | Promise<void>,
    socket?: boolean | Omit<EntitySocketManagerCreateContext<TYPE, RECORD>, 'type'>
};
