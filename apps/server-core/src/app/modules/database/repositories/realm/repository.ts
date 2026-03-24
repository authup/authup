/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm } from '@authup/core-kit';
import { REALM_MASTER_NAME } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IRealmRepository } from '../../../../../core/index.ts';
import { RealmEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class RealmRepositoryAdapter implements IRealmRepository {
    private readonly repository: Repository<Realm>;

    constructor(repository: Repository<Realm>) {
        this.repository = repository;
    }

    findOneById(id: string): Promise<Realm | null> {
        return this.findOneBy({ id });
    }

    findOneByName(name: string): Promise<Realm | null> {
        const qb = this.repository.createQueryBuilder('realm');
        qb.where('realm.name LIKE :name', { name });

        return qb.getOne();
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Realm>> {
        const qb = this.repository.createQueryBuilder('realm');
        qb.groupBy('realm.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'realm',
            filters: {
                allowed: ['id', 'built_in', 'display_name', 'name'],
            },
            pagination: {
                maxLimit: 50,
            },
            fields: {
                allowed: ['id', 'name', 'description', 'built_in', 'created_at', 'updated_at'],
            },
            sort: {
                allowed: ['id', 'name', 'created_at', 'updated_at'],
            },
        });

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

    async resolve(id: string | undefined, withFallback: true): Promise<Realm>;

    async resolve(id: string | undefined, withFallback?: boolean): Promise<Realm | null>;

    async resolve(id: string | undefined, withFallback?: boolean): Promise<Realm | null> {
        let entity: Realm | null = null;

        if (id) {
            entity = await this.findOneByIdOrName(id);
        }

        if (!entity && withFallback) {
            entity = await this.findOneBy({ name: REALM_MASTER_NAME });
        }

        return entity;
    }
}
