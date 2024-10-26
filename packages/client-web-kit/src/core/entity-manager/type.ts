/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainTypeMap } from '@authup/core-kit';
import type { BuildInput, FieldsBuildInput, FiltersBuildInput } from 'rapiq';
import type {
    MaybeRef, Ref, SetupContext, SlotsType,
    VNodeChild,
} from 'vue';
import type { EntitySocketContext } from '../entity-socket';

type EntityWithID = {
    [key: string]: any,
    id: any
};

export type EntityID<T> = T extends EntityWithID ?
    T['id'] :
    never;

export type EntityManagerRenderFn = () => VNodeChild;

export type EntityManagerResolveContext<T> = {
    id?: EntityID<T>,
    query?: T extends Record<string, any> ? BuildInput<T> : never
};

export type EntityManager<T> = {
    busy: Ref<boolean>,
    data: Ref<T | undefined>,
    error: Ref<Error | undefined>,
    lockId: Ref<EntityID<T> | undefined>,
    create(entity: Partial<T>): Promise<void>,
    createOrUpdate(entity: Partial<T>) : Promise<void>,
    created(entity: T) : void,
    update(entity: Partial<T>) : Promise<void>,
    updated(entity: T) : void,
    delete() : Promise<void>,
    deleted(entity?: T) : void;
    failed(e: Error) : void;
    resolve(ctx?: EntityManagerResolveContext<T>) : Promise<void>;
    resolveOrFail(ctx?: EntityManagerResolveContext<T>) : Promise<void>;
    render(content?: VNodeChild | EntityManagerRenderFn) : VNodeChild;
    renderError(error: unknown) : VNodeChild;
};

export type EntityManagerProps<T> = {
    entity?: T,
    entityId?: EntityID<T>,
    queryFilters?: T extends Record<string, any> ? FiltersBuildInput<T> : never,
    queryFields?: T extends Record<string, any> ? FieldsBuildInput<T> : never
};

export type EntityManagerSlotProps<T> = {
    [K in keyof EntityManager<T>]: EntityManager<T>[K] extends Ref<infer U> ?
        U :
        EntityManager<T>[K]
};

export type EntityManagerSlotsType<T> = {
    default?: EntityManagerSlotProps<T>,
    error?: Error
};

export type EntityManagerEventsType<T> = {
    failed: (item: Error) => true,
    created: (item: T) => true,
    deleted: (item: T) => true,
    updated: (item: T) => true,
    resolved: (_item?: T) => true
};

export type EntityManagerContext<
    A extends keyof DomainTypeMap,
    T = DomainTypeMap[A],
> = {
    type: A,
    setup?: Partial<SetupContext<
    EntityManagerEventsType<T>,
    SlotsType<EntityManagerSlotsType<T>>
    >>,
    props?: EntityManagerProps<T>,
    realmId?: MaybeRef<string> | ((entity: T | undefined) => string | undefined),
    onResolved?(entity?: T) : any,
    onCreated?(entity: T): any,
    onUpdated?(entity: Partial<T>): any,
    onDeleted?(entity: T): any,
    onFailed?(e: Error): any,
    socket?: Omit<EntitySocketContext<A, T>, 'type'> | boolean;
};
