/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientPermission } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult } from '../../../../../core/entities/types.ts';
import type { IClientPermissionRepository } from '../../../../../core/entities/client-permission/types.ts';
import { ClientPermissionEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class ClientPermissionRepositoryAdapter implements IClientPermissionRepository {
    private readonly repository: Repository<ClientPermission>;

    constructor(repository: Repository<ClientPermission>) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<ClientPermission>> {
        const qb = this.repository.createQueryBuilder('clientPermission');
        qb.groupBy('clientPermission.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'clientPermission',
            filters: {
                allowed: ['client_id', 'permission_id'],
            },
            relations: {
                allowed: [
                    'client',
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

    findOneById(id: string): Promise<ClientPermission | null> {
        return this.findOneBy({ id });
    }

    findOneByName(name: string): Promise<ClientPermission | null> {
        return this.repository.findOneBy({ name } as any);
    }

    findOneByIdOrName(idOrName: string): Promise<ClientPermission | null> {
        return this.findOneById(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<ClientPermission[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<ClientPermission | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<ClientPermission>): ClientPermission {
        return this.repository.create(data);
    }

    merge(entity: ClientPermission, data: Partial<ClientPermission>): ClientPermission {
        return this.repository.merge(entity, data);
    }

    async save(entity: ClientPermission): Promise<ClientPermission> {
        return this.repository.save(entity);
    }

    async remove(entity: ClientPermission): Promise<void> {
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<ClientPermission>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: ClientPermissionEntity,
        });
    }
}
