/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput, FieldsBuildInput, FiltersBuildInput } from 'rapiq';
import type {
    MaybeRef, Ref, SetupContext, SlotsType,
    VNodeChild,
} from 'vue';
import type { EntitySocketManagerCreateContext } from '../socket';

type EntityWithID = {
    [key: string]: any,
    id: any
};

export type EntityID<T> = T extends EntityWithID ?
    T['id'] :
    never;

export type ResourceManagerRenderFn = () => VNodeChild;

export type ResourceManagerResolveContext<T> = {
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
    resolve(ctx?: ResourceManagerResolveContext<T>) : Promise<void>;
    resolveOrFail(ctx?: ResourceManagerResolveContext<T>) : Promise<void>;
    render(content?: VNodeChild | ResourceManagerRenderFn) : VNodeChild;
    renderError(error: unknown) : VNodeChild;
};

export type EntityVProps<T> = {
    entity?: T,
    entityId?: EntityID<T>,
    queryFilters?: T extends Record<string, any> ? FiltersBuildInput<T> : never,
    queryFields?: T extends Record<string, any> ? FieldsBuildInput<T> : never
};

export type EntityVSlotProps<T> = {
    [K in keyof EntityManager<T>]: EntityManager<T>[K] extends Ref<infer U> ?
        U :
        EntityManager<T>[K]
};

export type EntityVSlots<T> = {
    default?: EntityVSlotProps<T>,
    error?: Error
};

export type EntityVEmitOptions<T> = {
    failed: (item: Error) => true,
    created: (item: T) => true,
    deleted: (item: T) => true,
    updated: (item: T) => true,
    resolved: (item?: T) => true
};

export type EntityManagerCreateContext<
    A extends string,
    T extends Record<string, any>,
> = {
    type: A,
    setup?: Partial<SetupContext<
    EntityVEmitOptions<T>,
    SlotsType<EntityVSlots<T>>
    >>,
    props?: EntityVProps<T>,
    realmId?: MaybeRef<string> | ((entity: T | undefined) => string | undefined),
    onResolved?(entity?: T) : any,
    onCreated?(entity: T): any,
    onUpdated?(entity: Partial<T>): any,
    onDeleted?(entity: T): any,
    onFailed?(e: Error): any,
    socket?: Omit<EntitySocketManagerCreateContext<A, T>, 'type'> | boolean;
};
