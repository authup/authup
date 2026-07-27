/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { RequestBaseOptions, Response } from 'hapic';
import type { EntityQueryInput } from '../helpers';

/**
 * The wire shape of every entity-record response: the record under
 * `data`, response-scoped extras under `meta` (mirroring
 * `EntityCollectionResponse`).
 */
export type EntityRecordWrappedResponse<R, M extends Record<string, any> = Record<string, any>> = {
    data: R,
    meta: M,
};

/**
 * @deprecated Record responses carry the `{ data, meta }` envelope —
 * use {@link EntityRecordWrappedResponse} directly.
 */
export type EntityRecordResponse<R> = EntityRecordWrappedResponse<R>;

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
    getMany(record?: EntityQueryInput<T>) : Promise<EntityCollectionResponse<T>>;
    getOne(id: DomainEntityID<T>, record?: EntityQueryInput<T>) : Promise<EntityRecordWrappedResponse<T>>;
    delete(id: DomainEntityID<T>) : Promise<EntityRecordWrappedResponse<T>>;
    create(data: TCreate) : Promise<EntityRecordWrappedResponse<T>>;
}

export interface IEntityAPI<
    T extends ObjectLiteral,
    TCreate = Partial<T>,
    TUpdate = Partial<T>,
> extends IEntityAPISlim<T, TCreate> {
    update(id: DomainEntityID<T>, data: TUpdate) : Promise<EntityRecordWrappedResponse<T>>;
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
