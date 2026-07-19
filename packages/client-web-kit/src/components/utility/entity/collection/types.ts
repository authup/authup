/*
 * Copyright (c) 2022-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { QueryFiltersInput, QueryInput } from '../../../../core';
import type {
    MaybeRef,
    Ref,
    SetupContext,
    VNodeChild,
} from 'vue';
import type { EntitySocketManagerCreateContext } from '../socket';
import type { EntityCollectionSlotName } from './constants';

type Entity<T> = T extends Record<string, any> ? T : never;

/** Replaces `@vuecs/list-controls` `ListLoadFn` — async loader keyed by query meta. */
export type ListLoadFn<M = any> = (meta?: M) => Promise<void>;

export type ListMeta<T extends Record<string, any>> = {
    total?: number,
    busy?: boolean
} & QueryInput<T>;

/** Minimal slot-prop shape — superset of what the @vuecs/list-controls 2.x types exposed. */
export type ListSlotProps<T, M = any> = {
    data: T[];
    busy: boolean;
    total: number;
    load: ListLoadFn<M>;
    meta: M;
    created(item: T): void;
    updated(item: T): void;
    deleted(item: T): void;
};

export type ListBodySlotProps<T, M = any> = ListSlotProps<T, M>;
export type ListHeaderSlotProps<T, M = any> = ListSlotProps<T, M>;
export type ListFooterSlotProps<T, M = any> = ListSlotProps<T, M>;
export type ListItemSlotProps<T> = {
    data: T;
    index: number;
    busy: boolean;
    updated(item: T): void;
    deleted(item: T): void;
};

// Chrome options (header / footer / no-more / loading) don't carry the
// row type directly — they're presentational — but keep the generic
// param on the public type aliases so call sites that pass
// `ListHeaderOptions<User>` keep type-checking after the API rewrite.
// Reference the type param in a phantom `_typeWitness?: (row: T) => void`
// field so eslint's no-unused-vars stays satisfied without dropping the
// public generic API.
export type ListHeaderOptions<T> = {
    content?: VNodeChild,
    tag?: string,
    /** @internal phantom field — keeps `T` referenced for eslint while preserving the public generic surface. */
    _typeWitness?: (row: T) => void,
};
export type ListFooterOptions<T> = ListHeaderOptions<T>;
export type ListNoMoreOptions<T> = ListHeaderOptions<T>;
export type ListLoadingOptions<T> = ListHeaderOptions<T>;
export type ListItemOptions<T> = {
    content?: VNodeChild | ((item: T, props: ListItemSlotProps<T>) => VNodeChild),
    tag?: string,
};

export type ListBodyOptions<T> = {
    data?: T[],
    tag?: string,
    item?: ListItemOptions<T>,
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
    query?: QueryInput<Entity<T>>,
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
    [EntityCollectionSlotName.ITEM]: ListItemSlotProps<T>,
    [EntityCollectionSlotName.ITEM_ACTIONS]: ListItemSlotProps<T>,
    [EntityCollectionSlotName.ITEM_ACTIONS_EXTRA]: ListItemSlotProps<T>,
    [EntityCollectionSlotName.HEADER]: ListHeaderSlotProps<T, ListMeta<T>>,
    [EntityCollectionSlotName.FOOTER]: ListFooterSlotProps<T, ListMeta<T>>,
    [EntityCollectionSlotName.NO_MORE]: undefined,
    [EntityCollectionSlotName.LOADING]: undefined
};

export type EntityCollectionVEmitOptions<T> = {
    created: (item: T) => true,
    deleted: (item: T) => true,
    updated: (item: T) => true,
    failed: (error: Error) => true
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
    query?: QueryInput<Entity<RECORD>> | (() => QueryInput<Entity<RECORD>>),
    queryFilters?: ((q: string) => QueryFiltersInput<Entity<RECORD>>),
    onCreated?: (entity: RECORD, meta: ListMeta<RECORD>) => void | Promise<void>,
    socket?: boolean | Omit<EntitySocketManagerCreateContext<TYPE, RECORD>, 'type'>
};
