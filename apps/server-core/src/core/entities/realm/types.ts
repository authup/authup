/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult, IEntityRepository } from '../types.ts';

export interface IRealmRepository extends IEntityRepository<Realm> {
    findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Realm>>;

    findOneByIdOrName(idOrName: string): Promise<Realm | null>;

    findOneBy(where: Record<string, any>): Promise<Realm | null>;

    create(data: Partial<Realm>): Realm;

    merge(entity: Realm, data: Partial<Realm>): Realm;

    save(entity: Realm): Promise<Realm>;

    remove(entity: Realm): Promise<void>;

    validateJoinColumns(data: Partial<Realm>): Promise<void>;
}
