/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import { REALM_MASTER_NAME  } from '@authup/core-kit';
import { InternalError } from '@authup/errors';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import { buildRedisKeyPath } from '@authup/server-kit';
import type { IRealmRepository } from '../../../../../core/index.ts';
import { CachePrefix, RealmEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class RealmRepositoryAdapter implements IRealmRepository {
    private readonly repository: Repository<Realm>;

    constructor(repository: Repository<Realm>) {
        this.repository = repository;
    }

    findOneById(id: string): Promise<Realm | null> {
        const qb = this.repository.createQueryBuilder('realm');
        qb.where('realm.id = :id', { id });
        qb.cache(
            buildRedisKeyPath({
                prefix: CachePrefix.REALM,
                key: id,
            }),
            60_000,
        );

        return qb.getOne();
    }

    findOneByName(name: string): Promise<Realm | null> {
        const qb = this.repository.createQueryBuilder('realm');
        qb.where('realm.name = :name', { name: name.trim().toLowerCase() });

        return qb.getOne();
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<Realm>> {
        const qb = this.repository.createQueryBuilder('realm');
        qb.groupBy('realm.id');

        const { pagination } = applyQuery(qb, query);

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneByIdOrName(idOrName: string): Promise<Realm | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<Realm[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<Realm | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<Realm>): Realm {
        return this.repository.create(data);
    }

    merge(entity: Realm, data: Partial<Realm>): Realm {
        return this.repository.merge(entity, data);
    }

    async save(entity: Realm): Promise<Realm> {
        return this.repository.save(entity);
    }

    async remove(entity: Realm): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<Realm>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: RealmEntity,
        });
    }

    async resolveId(key: string): Promise<string | null> {
        if (isUUID(key)) {
            return key;
        }

        const entity = await this.findOneByName(key);
        return entity ? entity.id : null;
    }

    async resolve(id: string | undefined, withFallback: true): Promise<Realm>;

    async resolve(id: string | undefined, withFallback?: boolean): Promise<Realm | null>;

    async resolve(id: string | undefined, withFallback?: boolean): Promise<Realm | null> {
        let entity: Realm | null = null;

        if (id) {
            entity = await this.findOneByIdOrName(id);
        }

        if (!entity && withFallback) {
            entity = await this.findOneBy({ name: REALM_MASTER_NAME });
            if (!entity) {
                throw new InternalError('The master realm could not be resolved.');
            }
        }

        return entity;
    }
}
