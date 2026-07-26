/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ClientRole } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery, redactFieldConditions } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IClientRoleRepository } from '../../../../../core/entities/client-role/types.ts';
import { ClientRoleEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class ClientRoleRepositoryAdapter implements IClientRoleRepository {
    private readonly repository: Repository<ClientRole>;

    constructor(repository: Repository<ClientRole>) {
        this.repository = repository;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<ClientRole>> {
        const qb = this.repository.createQueryBuilder('clientRole');
        qb.groupBy('clientRole.id');

        const { pagination } = applyQuery(qb, query);

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: redactFieldConditions(query, entities),
            meta: {
                total,
                ...pagination,
            },
        };
    }

    findOneById(id: string): Promise<ClientRole | null> {
        return this.findOneBy({ id });
    }

    findOneByName(_name: string): Promise<ClientRole | null> {
        return Promise.resolve(null);
    }

    findOneByIdOrName(idOrName: string): Promise<ClientRole | null> {
        return this.findOneById(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<ClientRole[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<ClientRole | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<ClientRole>): ClientRole {
        return this.repository.create(data);
    }

    merge(entity: ClientRole, data: Partial<ClientRole>): ClientRole {
        return this.repository.merge(entity, data);
    }

    async save(entity: ClientRole): Promise<ClientRole> {
        return this.repository.save(entity);
    }

    async remove(entity: ClientRole): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<ClientRole>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: ClientRoleEntity,
        });
    }
}
