/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission } from '@authup/core-kit';
import { ROLE_ADMIN_NAME } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IPermissionRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import {
    PermissionEntity,
    PolicyRepository,
    RolePermissionEntity,
    RoleRepository,
    resolveRealm,
} from '../../../../../adapters/database/domains/index.ts';

export class PermissionRepositoryAdapter implements IPermissionRepository {
    private readonly repository: Repository<Permission>;

    constructor(repository: Repository<Permission>) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Permission>> {
        const qb = this.repository.createQueryBuilder('permission');
        qb.groupBy('permission.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'permission',
            filters: {
                allowed: ['id', 'display_name', 'name', 'built_in'],
            },
            pagination: {
                maxLimit: 50,
            },
            relations: {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error onJoin is not in the type definition
                allowed: ['policy'],
                onJoin: (_property: string, key: string, q: any) => {
                    q.addGroupBy(`${key}.id`);
                },
            },
            sort: {
                allowed: ['id', 'name', 'created_at', 'updated_at'],
            },
        });

        const [entities, total] = await qb.getManyAndCount();

        for (let i = 0; i < entities.length; i++) {
            await this.loadPolicyTree(entities[i] as PermissionEntity);
        }

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    findOneById(id: string): Promise<Permission | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Permission | null> {
        const qb = this.repository.createQueryBuilder('permission');
        qb.where('permission.name LIKE :name', { name });

        if (realmKey) {
            const realm = await resolveRealm(realmKey);
            if (realm) {
                qb.andWhere('permission.realm_id = :realmId', { realmId: realm.id });
            }
        }

        return qb.getOne();
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Permission | null> {
        const result = isUUID(idOrName) ?
            await this.findOneById(idOrName) :
            await this.findOneByName(idOrName, realm);

        if (result) {
            await this.loadPolicyTree(result as PermissionEntity);
        }

        return result;
    }

    async findOneBy(where: Record<string, any>): Promise<Permission | null> {
        return this.repository.findOneBy(where);
    }

    create(data: Partial<Permission>): Permission {
        return this.repository.create(data);
    }

    merge(entity: Permission, data: Partial<Permission>): Permission {
        return this.repository.merge(entity, data);
    }

    async save(entity: Permission): Promise<Permission> {
        return this.repository.save(entity);
    }

    async remove(entity: Permission): Promise<void> {
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<Permission>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: PermissionEntity,
        });
    }

    private async loadPolicyTree(entity: PermissionEntity): Promise<void> {
        if (entity.policy) {
            const policyRepository = new PolicyRepository(this.repository.manager.connection);
            await policyRepository.findDescendantsTree(entity.policy);
        }
    }

    async checkUniqueness(data: Partial<Permission>, existing?: Permission): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: PermissionEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }

    async saveWithAdminRoleAssignment(entity: Permission): Promise<Permission> {
        await this.repository.manager.connection.transaction(async (entityManager) => {
            const transactionRepository = entityManager.getRepository(PermissionEntity);
            await transactionRepository.save(entity);

            const roleRepository = new RoleRepository(entityManager);
            const role = await roleRepository.findOneBy({
                name: ROLE_ADMIN_NAME,
                realm_id: IsNull(),
            });

            if (role) {
                const rolePermissionRepository = entityManager.getRepository(RolePermissionEntity);
                await rolePermissionRepository.insert({
                    role_id: role.id,
                    role_realm_id: role.realm_id,
                    permission_id: entity.id,
                    permission_realm_id: entity.realm_id,
                });

                await roleRepository.clearBoundPermissionsCache(role);
            }
        });

        return entity;
    }
}
