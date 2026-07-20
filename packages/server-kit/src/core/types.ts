/*
 * Copyright (c) 2025-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { IQuery } from '@rapiq/core';

/**
 * The pagination actually applied to a list query — mirrors the
 * pagination block a rapiq adapter reports back (limit/offset).
 */
export type EntityRepositoryPaginationMeta = {
    limit?: number,
    offset?: number
};

export type EntityRepositoryFindManyResult<T> = {
    data: T[],
    meta: EntityRepositoryPaginationMeta & {
        total: number
    }
};

export interface IEntityRepository<
    T extends ObjectLiteral = ObjectLiteral,
> {
    findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<T>>;

    findOneById(id: string) : Promise<T | null>;

    findOneByName(name: string, realm?: string) : Promise<T | null>;

    findOneByIdOrName(idOrName: string, realm?: string): Promise<T | null>;

    findManyBy(where: Record<string, any>): Promise<T[]>;

    findOneBy(where: Record<string, any>): Promise<T | null>;

    create(data: Partial<T>): T;

    merge(entity: T, data: Partial<T>): T;

    save(entity: T): Promise<T>;

    remove(entity: T): Promise<void>;

    validateJoinColumns(data: Partial<T>): Promise<void>;
}
