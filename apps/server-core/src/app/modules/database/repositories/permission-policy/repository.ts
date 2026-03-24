/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PermissionPolicy } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IPermissionPolicyRepository } from '../../../../../core/index.ts';
import { PermissionPolicyEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class PermissionPolicyRepositoryAdapter implements IPermissionPolicyRepository {
    private readonly repository: Repository<PermissionPolicy>;

    constructor(repository: Repository<PermissionPolicy>) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<PermissionPolicy>> {
        const qb = this.repository.createQueryBuilder('permissionPolicy');
        qb.groupBy('permissionPolicy.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'permissionPolicy',
            filters: {
                allowed: ['permission_id', 'policy_id'],
            },
            relations: {
                allowed: [
                    'permission',
                    'policy',
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

    findOneById(id: string): Promise<PermissionPolicy | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(): Promise<PermissionPolicy | null> {
        return null;
    }

    findOneByIdOrName(idOrName: string): Promise<PermissionPolicy | null> {
        return this.findOneById(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<PermissionPolicy[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<PermissionPolicy | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<PermissionPolicy>): PermissionPolicy {
        return this.repository.create(data);
    }

    merge(entity: PermissionPolicy, data: Partial<PermissionPolicy>): PermissionPolicy {
        return this.repository.merge(entity, data);
    }

    async save(entity: PermissionPolicy): Promise<PermissionPolicy> {
        return this.repository.save(entity);
    }

    async remove(entity: PermissionPolicy): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<PermissionPolicy>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: PermissionPolicyEntity,
        });
    }
}
