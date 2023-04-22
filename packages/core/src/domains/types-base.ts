/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, RequestBaseOptions } from 'hapic';
import type { BuildInput } from 'rapiq';
import type { DomainEventName } from './contstants';

export type SingleResourceResponse<R> = R;
export type CollectionResourceResponse<R> = {
    data: R[],
    meta: {
        limit: number,
        offset: number,
        total: number
    }
};

export interface DomainAPISlim<
    T extends Record<string, any> & { id: string | number },
> {
    getMany(record?: BuildInput<T>);
    getOne(id: T['id'], record?: BuildInput<T>);
    delete(id: T['id']) : Promise<SingleResourceResponse<T>>;
    create(data: Partial<T>) : Promise<SingleResourceResponse<T>>;
}

export interface DomainAPI<
    T extends Record<string, any> & { id: string | number },
> extends DomainAPISlim<T> {
    update(id: T['id'], data: Partial<T>) : Promise<SingleResourceResponse<T>>;
}

export type BaseAPIContext = {
    client?: Client | RequestBaseOptions
};

export type DomainEventBaseContext = {
    event: `${DomainEventName}`,
    type: string
};
