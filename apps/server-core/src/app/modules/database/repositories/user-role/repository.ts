/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserRole } from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IUserRoleRepository } from '../../../../../core/index.ts';
import { UserRoleEntity } from '../../../../../adapters/database/domains/index.ts';

export class UserRoleRepositoryAdapter implements IUserRoleRepository {
    private readonly repository: Repository<UserRole>;

    private readonly dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = dataSource.getRepository(UserRoleEntity);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<UserRole>> {
        const qb = this.repository.createQueryBuilder('userRole');
        qb.groupBy('userRole.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'userRole',
            filters: {
                allowed: ['role_id', 'user_id'],
            },
            relations: {
                allowed: ['user', 'role'],
                // @ts-expect-error onJoin is not in the type definition
                onJoin: (_property: string, key: string, q: any) => {
                    q.addGroupBy(`${key}.id`);
                },
            },
            sort: {
                allowed: [
                    'id',
                    'created_at',
                    'updated_at',
                ],
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

    findOneById(id: string): Promise<UserRole | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string): Promise<UserRole | null> {
        return this.repository.findOneBy({ name } as any);
    }

    findOneByIdOrName(idOrName: string): Promise<UserRole | null> {
        return this.findOneById(idOrName);
    }

    async findOneBy(where: Record<string, any>): Promise<UserRole | null> {
        return this.repository.findOneBy(where);
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
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<UserRole>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.dataSource,
            entityTarget: UserRoleEntity,
        });
    }
}
