/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission, Realm } from '@authup/core-kit';
import { ROLE_ADMIN_NAME } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { IsNull } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IPermissionRepository, IRealmRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { translateWhereConditions } from '../helpers.ts';
import {
    PermissionEntity,
    RolePermissionEntity,
    RoleRepository,
} from '../../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type PermissionRepositoryAdapterContext = {
    repository: Repository<PermissionEntity>,
    realmRepository: Repository<Realm>,
};

export class PermissionRepositoryAdapter implements IPermissionRepository {
    private readonly repository: Repository<PermissionEntity>;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: PermissionRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
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
                allowed: [],
            },
            sort: {
                allowed: ['id', 'name', 'created_at', 'updated_at'],
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

    findOneById(id: string): Promise<Permission | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Permission | null> {
        const qb = this.repository.createQueryBuilder('permission');
        qb.where('permission.name LIKE :name', { name });

        if (realmKey) {
            const realm = await this.realmRepository.resolve(realmKey);
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

        return result;
    }

    async findManyBy(where: Record<string, any>): Promise<Permission[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<Permission | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<Permission>): Permission {
        return this.repository.create(data as Partial<PermissionEntity>);
    }

    merge(entity: Permission, data: Partial<Permission>): Permission {
        return this.repository.merge(entity as PermissionEntity, data as Partial<PermissionEntity>);
    }

    async save(entity: Permission): Promise<Permission> {
        return this.repository.save(entity as PermissionEntity);
    }

    async remove(entity: Permission): Promise<void> {
        await this.repository.remove(entity as PermissionEntity);
    }

    async validateJoinColumns(data: Partial<Permission>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: PermissionEntity,
        });
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
            await transactionRepository.save(entity as PermissionEntity);

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
