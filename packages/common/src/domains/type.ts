/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BuildInput } from 'rapiq';

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
    T extends Record<string, any> = Record<string, any>,
    ID extends keyof T = 'id',
> {
    getMany(record?: BuildInput<T>);
    getOne(id: T[ID], record?: BuildInput<T>);
    delete(id: T[ID]) : Promise<SingleResourceResponse<T>>;
    create(data: Partial<T>) : Promise<SingleResourceResponse<T>>;
}

export interface DomainAPI<
    T extends Record<string, any> = Record<string, any>,
    ID extends keyof T = 'id',
> extends DomainAPISlim<T, ID> {
    update(id: T[ID], data: Partial<T>) : Promise<SingleResourceResponse<T>>;
}
