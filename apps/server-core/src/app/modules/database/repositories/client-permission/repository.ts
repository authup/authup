/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientPermission } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IClientPermissionRepository } from '../../../../../core/entities/client-permission/types.ts';
import { ClientPermissionEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class ClientPermissionRepositoryAdapter implements IClientPermissionRepository {
    private readonly repository: Repository<ClientPermission>;

    constructor(repository: Repository<ClientPermission>) {
        this.repository = repository;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<ClientPermission>> {
        const qb = this.repository.createQueryBuilder('clientPermission');
        qb.groupBy('clientPermission.id');

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

    findOneById(id: string): Promise<ClientPermission | null> {
        return this.findOneBy({ id });
    }

    findOneByName(_name: string): Promise<ClientPermission | null> {
        return Promise.resolve(null);
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
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<ClientPermission>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: ClientPermissionEntity,
        });
    }
}
