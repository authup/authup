/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientScope } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IClientScopeRepository } from '../../../../../core/entities/client-scope/types.ts';
import { ClientScopeEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class ClientScopeRepositoryAdapter implements IClientScopeRepository {
    private readonly repository: Repository<ClientScope>;

    constructor(repository: Repository<ClientScope>) {
        this.repository = repository;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<ClientScope>> {
        const qb = this.repository.createQueryBuilder('clientScope');
        qb.groupBy('clientScope.id');

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

    findOneById(id: string): Promise<ClientScope | null> {
        return this.findOneBy({ id });
    }

    findOneByName(_name: string): Promise<ClientScope | null> {
        return Promise.resolve(null);
    }

    findOneByIdOrName(idOrName: string): Promise<ClientScope | null> {
        return this.findOneById(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<ClientScope[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<ClientScope | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<ClientScope>): ClientScope {
        return this.repository.create(data);
    }

    merge(entity: ClientScope, data: Partial<ClientScope>): ClientScope {
        return this.repository.merge(entity, data);
    }

    async save(entity: ClientScope): Promise<ClientScope> {
        return this.repository.save(entity);
    }

    async remove(entity: ClientScope): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<ClientScope>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: ClientScopeEntity,
        });
    }
}
