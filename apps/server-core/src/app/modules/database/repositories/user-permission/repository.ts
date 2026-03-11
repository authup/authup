/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserPermission } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IUserPermissionRepository } from '../../../../../core/index.ts';
import { UserPermissionEntity } from '../../../../../adapters/database/domains/index.ts';

export class UserPermissionRepositoryAdapter implements IUserPermissionRepository {
    private readonly repository: Repository<UserPermission>;

    constructor(repository: Repository<UserPermission>) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<UserPermission>> {
        const qb = this.repository.createQueryBuilder('userPermission');
        qb.groupBy('userPermission.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'userPermission',
            filters: {
                allowed: [
                    'user_id',
                    'permission_id',
                ],
            },
            relations: {
                allowed: [
                    'user',
                    'permission',
                ],
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

    findOneById(id: string): Promise<UserPermission | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string): Promise<UserPermission | null> {
        return this.repository.findOneBy({ name } as any);
    }

    findOneByIdOrName(idOrName: string): Promise<UserPermission | null> {
        return this.findOneById(idOrName);
    }

    async findOneBy(where: Record<string, any>): Promise<UserPermission | null> {
        return this.repository.findOneBy(where);
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
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<UserPermission>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: UserPermissionEntity,
        });
    }
}
