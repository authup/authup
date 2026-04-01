/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RoleAttribute } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IRoleAttributeRepository } from '../../../../../core/index.ts';
import { RoleAttributeEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class RoleAttributeRepositoryAdapter implements IRoleAttributeRepository {
    private readonly repository: Repository<RoleAttribute>;

    constructor(repository: Repository<RoleAttribute>) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<RoleAttribute>> {
        const qb = this.repository.createQueryBuilder('roleAttribute');
        qb.groupBy('roleAttribute.id');

        const {
            pagination 
        } = applyQuery(qb, query, {
            defaultAlias: 'roleAttribute',
            filters: {
                allowed: ['id', 'name', 'role_id', 'realm_id'],
            },
            sort: {
                allowed: ['id', 'name', 'role_id', 'realm_id', 'created_at', 'updated_at'],
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

    findOneById(id: string): Promise<RoleAttribute | null> {
        return this.findOneBy({
            id 
        });
    }

    async findOneByName(): Promise<RoleAttribute | null> {
        return null;
    }

    async findOneByIdOrName(idOrName: string): Promise<RoleAttribute | null> {
        return this.findOneById(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<RoleAttribute[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<RoleAttribute | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<RoleAttribute>): RoleAttribute {
        return this.repository.create(data);
    }

    merge(entity: RoleAttribute, data: Partial<RoleAttribute>): RoleAttribute {
        return this.repository.merge(entity, data);
    }

    async save(entity: RoleAttribute): Promise<RoleAttribute> {
        return this.repository.save(entity);
    }

    async remove(entity: RoleAttribute): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<RoleAttribute>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: RoleAttributeEntity,
        });
    }
}
