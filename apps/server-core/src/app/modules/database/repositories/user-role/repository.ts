/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserRole } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IUserRoleRepository } from '../../../../../core/index.ts';
import { UserRoleEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class UserRoleRepositoryAdapter implements IUserRoleRepository {
    private readonly repository: Repository<UserRole>;

    constructor(repository: Repository<UserRole>) {
        this.repository = repository;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<UserRole>> {
        const qb = this.repository.createQueryBuilder('userRole');
        qb.groupBy('userRole.id');

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

    findOneById(id: string): Promise<UserRole | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(_name: string): Promise<UserRole | null> {
        return Promise.resolve(null);
    }

    findOneByIdOrName(idOrName: string): Promise<UserRole | null> {
        return this.findOneById(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<UserRole[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<UserRole | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<UserRole>): UserRole {
        return this.repository.create(data);
    }

    merge(entity: UserRole, data: Partial<UserRole>): UserRole {
        return this.repository.merge(entity, data);
    }

    async save(entity: UserRole): Promise<UserRole> {
        return this.repository.save(entity);
    }

    async remove(entity: UserRole): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<UserRole>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: UserRoleEntity,
        });
    }
}
