/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotPermission } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult } from '../../../../../core/entities/types.ts';
import type { IRobotPermissionRepository } from '../../../../../core/entities/robot-permission/types.ts';
import { RobotPermissionEntity } from '../../../../../adapters/database/domains/index.ts';

export class RobotPermissionRepositoryAdapter implements IRobotPermissionRepository {
    private readonly repository: Repository<RobotPermission>;

    constructor(repository: Repository<RobotPermission>) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<RobotPermission>> {
        const qb = this.repository.createQueryBuilder('robotPermission');
        qb.groupBy('robotPermission.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'robotPermission',
            filters: {
                allowed: ['robot_id', 'permission_id'],
            },
            relations: {
                allowed: [
                    'robot',
                    'permission',
                ],
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

    findOneById(id: string): Promise<RobotPermission | null> {
        return this.findOneBy({ id });
    }

    findOneByName(name: string): Promise<RobotPermission | null> {
        return this.repository.findOneBy({ name } as any);
    }

    findOneByIdOrName(idOrName: string): Promise<RobotPermission | null> {
        return this.findOneById(idOrName);
    }

    async findOneBy(where: Record<string, any>): Promise<RobotPermission | null> {
        return this.repository.findOneBy(where);
    }

    create(data: Partial<RobotPermission>): RobotPermission {
        return this.repository.create(data);
    }

    merge(entity: RobotPermission, data: Partial<RobotPermission>): RobotPermission {
        return this.repository.merge(entity, data);
    }

    async save(entity: RobotPermission): Promise<RobotPermission> {
        return this.repository.save(entity);
    }

    async remove(entity: RobotPermission): Promise<void> {
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<RobotPermission>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: RobotPermissionEntity,
        });
    }
}
