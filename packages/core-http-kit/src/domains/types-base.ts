/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { RequestBaseOptions, Response } from 'hapic';
import type { BuildInput } from 'rapiq';

export type EntityRecordResponse<R> = R;
export type EntityCollectionResponse<R> = {
    data: R[],
    meta: {
        limit?: number,
        offset?: number,
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

export interface IEntityAPISlim<
    T extends ObjectLiteral,
    TCreate = Partial<T>,
> {
    getMany(record?: BuildInput<T>) : Promise<EntityCollectionResponse<T>>;
    getOne(id: DomainEntityID<T>, record?: BuildInput<T>) : Promise<EntityRecordResponse<T>>;
    delete(id: DomainEntityID<T>) : Promise<EntityRecordResponse<T>>;
    create(data: TCreate) : Promise<EntityRecordResponse<T>>;
}

export interface IEntityAPI<
    T extends ObjectLiteral,
    TCreate = Partial<T>,
    TUpdate = Partial<T>,
> extends IEntityAPISlim<T, TCreate> {
    update(id: DomainEntityID<T>, data: TUpdate) : Promise<EntityRecordResponse<T>>;
}

/**
 * Minimal transport surface the domain layer depends on. hapic's
 * Client satisfies it structurally — it is the default implementation,
 * but any object with these methods (a fake, another http library
 * adapter) can take its place.
 */
export type ApiTransport = {
    getBaseURL() : string | undefined,
    get<T = any>(url: string, config?: RequestBaseOptions) : Promise<Response<T>>,
    post<T = any>(url: string, body?: any, config?: RequestBaseOptions) : Promise<Response<T>>,
    put<T = any>(url: string, body?: any, config?: RequestBaseOptions) : Promise<Response<T>>,
    delete<T = any>(url: string, config?: RequestBaseOptions) : Promise<Response<T>>,
};

export type BaseAPIContext = {
    client?: ApiTransport | RequestBaseOptions
};
