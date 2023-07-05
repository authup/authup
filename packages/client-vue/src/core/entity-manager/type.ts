/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DomainType } from '@authup/core';
import type { BuildInput, FiltersBuildInput } from 'rapiq';
import type { Ref, SetupContext, SlotsType } from 'vue';
import type { VNodeChild } from 'vue/dist/vue';

export type EntityManagerRecord = {
    [key: string]: any,
    id: any
};

export type EntityManager<T extends EntityManagerRecord> = {
    busy: Ref<boolean>,
    entity: Ref<T | undefined>,
    lockId: Ref<T['id'] | undefined>,
    create(entity: Partial<T>): Promise<void>,
    createOrUpdate(entity: Partial<T>) : Promise<void>,
    created(entity: T) : void,
    update(entity: Partial<T>) : Promise<void>,
    updated(entity: T) : void,
    delete() : Promise<void>,
    deleted(entity?: T) : void;
    failed(e: Error) : void;
    resolve() : Promise<void>;
    resolveOrFail() : Promise<void>;
    render(error?: unknown) : VNodeChild;
};

export type EntityManagerProps<T extends EntityManagerRecord> = {
    entity?: T,
    entityId?: T['id'],
    where?: FiltersBuildInput<T>,
    query?: BuildInput<T>
};

export type EntityManagerSlotProps<T extends EntityManagerRecord> = {
    [K in keyof EntityManager<T>]: EntityManager<T>[K] extends Ref<infer U> ?
        U :
        EntityManager<T>[K]
};

export type EntityManagerSlotsType<T extends EntityManagerRecord> = {
    default?: EntityManagerSlotProps<T>,
    error?: Error
};

export type EntityManagerEventsType<T extends EntityManagerRecord> = {
    failed: (item: Error) => true,
    created: (item: T) => true,
    deleted: (item: T) => true,
    updated: (item: Partial<T>) => true
};

export type EntityManagerContext<T extends EntityManagerRecord> = {
    type: `${DomainType}`,
    setup?: Partial<SetupContext<EntityManagerEventsType<T>, SlotsType<EntityManagerSlotsType<T>>>>,
    props?: EntityManagerProps<T>,
    onCreated?(entity: T): any,
    onUpdated?(entity: Partial<T>): any,
    onDeleted?(entity: T): any,
    onFailed?(e: Error): any
};
