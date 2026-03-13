/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import type { Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IIdentityProviderRoleMappingRepository } from '../../../../../core/index.ts';
import { IdentityProviderRoleMappingEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';

export class IdentityProviderRoleMappingRepositoryAdapter implements IIdentityProviderRoleMappingRepository {
    private readonly repository: Repository<IdentityProviderRoleMapping>;

    constructor(repository: Repository<IdentityProviderRoleMapping>) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<IdentityProviderRoleMapping>> {
        const qb = this.repository.createQueryBuilder('providerRole');
        qb.groupBy('providerRole.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'providerRole',
            filters: {
                allowed: [
                    'role_id',
                    'provider_id',
                ],
            },
            sort: {
                allowed: [
                    'id',
                    'created_at',
                    'updated_at',
                ],
            },
            relations: {
                allowed: [
                    'role',
                    'provider',
                ],
                onJoin: (_property: string, key: string, q: any) => {
                    q.addGroupBy(`${key}.id`);
                },
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

    findOneById(id: string): Promise<IdentityProviderRoleMapping | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(): Promise<IdentityProviderRoleMapping | null> {
        return null;
    }

    async findOneByIdOrName(idOrName: string): Promise<IdentityProviderRoleMapping | null> {
        return this.findOneById(idOrName);
    }

    async findManyBy(where: Record<string, any>): Promise<IdentityProviderRoleMapping[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<IdentityProviderRoleMapping | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<IdentityProviderRoleMapping>): IdentityProviderRoleMapping {
        return this.repository.create(data);
    }

    merge(entity: IdentityProviderRoleMapping, data: Partial<IdentityProviderRoleMapping>): IdentityProviderRoleMapping {
        return this.repository.merge(entity, data);
    }

    async save(entity: IdentityProviderRoleMapping): Promise<IdentityProviderRoleMapping> {
        return this.repository.save(entity);
    }

    async remove(entity: IdentityProviderRoleMapping): Promise<void> {
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<IdentityProviderRoleMapping>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: IdentityProviderRoleMappingEntity,
        });
    }
}
