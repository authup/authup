/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RolePermission } from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IRolePermissionRepository } from '../../../../../core/index.ts';
import { RolePermissionEntity } from '../../../../../adapters/database/domains/index.ts';

export class RolePermissionRepositoryAdapter implements IRolePermissionRepository {
    private readonly repository: Repository<RolePermission>;

    private readonly dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = dataSource.getRepository(RolePermissionEntity);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<RolePermission>> {
        const qb = this.repository.createQueryBuilder('rolePermission');
        qb.groupBy('rolePermission.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'rolePermission',
            filters: {
                allowed: ['role_id', 'permission_id'],
            },
            relations: {
                allowed: [
                    'role',
                    'permission',
                ],
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
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

    findOneById(id: string): Promise<RolePermission | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string): Promise<RolePermission | null> {
        return this.repository.findOneBy({ name } as any);
    }

    findOneByIdOrName(idOrName: string): Promise<RolePermission | null> {
        return this.findOneById(idOrName);
    }

    async findOneBy(where: Record<string, any>): Promise<RolePermission | null> {
        return this.repository.findOneBy(where);
    }

    create(data: Partial<RolePermission>): RolePermission {
        return this.repository.create(data);
    }

    merge(entity: RolePermission, data: Partial<RolePermission>): RolePermission {
        return this.repository.merge(entity, data);
    }

    async save(entity: RolePermission): Promise<RolePermission> {
        return this.repository.save(entity);
    }

    async remove(entity: RolePermission): Promise<void> {
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<RolePermission>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.dataSource,
            entityTarget: RolePermissionEntity,
        });
    }
}
