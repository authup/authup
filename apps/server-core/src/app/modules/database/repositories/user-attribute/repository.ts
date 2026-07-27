/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { UserAttribute } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery, redactFieldConditions } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IUserAttributeRepository } from '../../../../../core/index.ts';
import { UserAttributeEntity } from '../../../../../adapters/database/domains/index.ts';
import { applyRealmScopeSelect, translateWhereConditions } from '../helpers.ts';

export class UserAttributeRepositoryAdapter implements IUserAttributeRepository {
    private readonly repository: Repository<UserAttribute>;

    constructor(repository: Repository<UserAttribute>) {
        this.repository = repository;
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<UserAttribute>> {
        const qb = this.repository.createQueryBuilder('userAttribute');
        qb.groupBy('userAttribute.id');

        const { pagination } = applyQuery(qb, query);

        applyRealmScopeSelect(qb, 'userAttribute', ['userId']);

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: redactFieldConditions(query, entities),
            meta: {
                total,
                ...pagination,
            },
        };
    }

    findOneById(id: string): Promise<UserAttribute | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(): Promise<UserAttribute | null> {
        return null;
    }

    async findOneByIdOrName(idOrName: string): Promise<UserAttribute | null> {
        return this.findOneById(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<UserAttribute[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<UserAttribute | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<UserAttribute>): UserAttribute {
        return this.repository.create(data);
    }

    merge(entity: UserAttribute, data: Partial<UserAttribute>): UserAttribute {
        return this.repository.merge(entity, data);
    }

    async save(entity: UserAttribute): Promise<UserAttribute> {
        return this.repository.save(entity);
    }

    async remove(entity: UserAttribute): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<UserAttribute>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: UserAttributeEntity,
        });
    }
}
