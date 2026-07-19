/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserPermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyRequestQuery } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IUserPermissionRepository } from '../../../../../core/index.ts';
import { UserPermissionEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class UserPermissionRepositoryAdapter implements IUserPermissionRepository {
    private readonly repository: Repository<UserPermission>;

    constructor(repository: Repository<UserPermission>) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<UserPermission>> {
        const qb = this.repository.createQueryBuilder('userPermission');
        qb.groupBy('userPermission.id');

        const { pagination } = applyRequestQuery(qb, query, { schema: EntityType.USER_PERMISSION });

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    findOneById(id: string): Promise<UserPermission | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(_name: string): Promise<UserPermission | null> {
        return Promise.resolve(null);
    }

    findOneByIdOrName(idOrName: string): Promise<UserPermission | null> {
        return this.findOneById(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<UserPermission[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<UserPermission | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<UserPermission>): UserPermission {
        return this.repository.create(data);
    }

    merge(entity: UserPermission, data: Partial<UserPermission>): UserPermission {
        return this.repository.merge(entity, data);
    }

    async save(entity: UserPermission): Promise<UserPermission> {
        return this.repository.save(entity);
    }

    async remove(entity: UserPermission): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<UserPermission>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: UserPermissionEntity,
        });
    }
}
