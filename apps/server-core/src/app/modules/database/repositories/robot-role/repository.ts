/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RobotRole } from '@authup/core-kit';
import type { DataSource, Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IRobotRoleRepository } from '../../../../../core/index.ts';
import { RobotRoleEntity } from '../../../../../adapters/database/domains/index.ts';

export class RobotRoleRepositoryAdapter implements IRobotRoleRepository {
    private readonly repository: Repository<RobotRole>;

    private readonly dataSource: DataSource;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.repository = dataSource.getRepository(RobotRoleEntity);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<RobotRole>> {
        const qb = this.repository.createQueryBuilder('robotRole');
        qb.groupBy('robotRole.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'robotRole',
            filters: {
                allowed: ['robot_id', 'role_id'],
            },
            relations: {
                allowed: ['robot', 'role'],
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

    findOneById(id: string): Promise<RobotRole | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string): Promise<RobotRole | null> {
        return this.repository.findOneBy({ name } as any);
    }

    findOneByIdOrName(idOrName: string): Promise<RobotRole | null> {
        return this.findOneById(idOrName);
    }

    async findOneBy(where: Record<string, any>): Promise<RobotRole | null> {
        return this.repository.findOneBy(where);
    }

    create(data: Partial<RobotRole>): RobotRole {
        return this.repository.create(data);
    }

    merge(entity: RobotRole, data: Partial<RobotRole>): RobotRole {
        return this.repository.merge(entity, data);
    }

    async save(entity: RobotRole): Promise<RobotRole> {
        return this.repository.save(entity);
    }

    async remove(entity: RobotRole): Promise<void> {
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<RobotRole>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.dataSource,
            entityTarget: RobotRoleEntity,
        });
    }
}
