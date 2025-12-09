/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { Client, RequestBaseOptions } from 'hapic';
import type { BuildInput } from 'rapiq';

export type EntityRecordResponse<R> = R;
export type EntityCollectionResponse<R> = {
    data: R[],
    meta: {
        limit: number,
        offset: number,
        total: number
    }
};

export type DomainEntityWithID = {
    [key: string]: any,
    id: any
};
export type DomainEntityID<T> = T extends DomainEntityWithID ?
    T['id'] :
    never;

export interface EntityAPISlim<T extends ObjectLiteral> {
    getMany(record?: BuildInput<T>) : Promise<EntityCollectionResponse<T>>;
    getOne(id: DomainEntityID<T>, record?: BuildInput<T>) : Promise<EntityRecordResponse<T>>;
    delete(id: DomainEntityID<T>) : Promise<EntityRecordResponse<T>>;
    create(data: Partial<T>) : Promise<EntityRecordResponse<T>>;
}

export interface EntityAPI<T extends ObjectLiteral> extends EntityAPISlim<T> {
    update(id: DomainEntityID<T>, data: Partial<T>) : Promise<EntityRecordResponse<T>>;
}

export type BaseAPIContext = {
    client?: Client | RequestBaseOptions
};
