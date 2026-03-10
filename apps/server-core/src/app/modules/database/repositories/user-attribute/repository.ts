/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAttribute } from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IUserAttributeRepository } from '../../../../../core/index.ts';
import { UserAttributeEntity } from '../../../../../adapters/database/domains/index.ts';

export class UserAttributeRepositoryAdapter implements IUserAttributeRepository {
    private readonly repository: Repository<UserAttribute>;

    private readonly dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = dataSource.getRepository(UserAttributeEntity);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<UserAttribute>> {
        const qb = this.repository.createQueryBuilder('userAttribute');
        qb.groupBy('userAttribute.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'userAttribute',
            filters: {
                allowed: ['id', 'name', 'user_id', 'realm_id'],
            },
            sort: {
                allowed: ['id', 'name', 'user_id', 'realm_id', 'created_at', 'updated_at'],
            },
            pagination: {
                maxLimit: 50,
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

    findOneById(id: string): Promise<UserAttribute | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(): Promise<UserAttribute | null> {
        return null;
    }

    async findOneByIdOrName(idOrName: string): Promise<UserAttribute | null> {
        return this.findOneById(idOrName);
    }

    async findOneBy(where: Record<string, any>): Promise<UserAttribute | null> {
        return this.repository.findOneBy(where);
    }

    create(data: Partial<UserAttribute>): UserAttribute {
        return this.repository.create(data);
    }

    merge(entity: UserAttribute, data: Partial<UserAttribute>): UserAttribute {
        return this.repository.merge(entity, data);
    }

    async save(entity: UserAttribute): Promise<UserAttribute> {
        return this.repository.save(entity);
    }

    async remove(entity: UserAttribute): Promise<void> {
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<UserAttribute>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.dataSource,
            entityTarget: UserAttributeEntity,
        });
    }
}
