/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, Role } from '@authup/core-kit';
import type { PermissionPolicyBinding } from '@authup/access';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IRealmRepository, IRoleRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { translateWhereConditions } from '../helpers.ts';
import { loadBoundPermissions } from '../bindings.ts';
import {
    CachePrefix,
    RoleEntity,
    RolePermissionEntity,
} from '../../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type RoleRepositoryAdapterContext = {
    repository: Repository<Role>,
    realmRepository: Repository<Realm>,
};

export class RoleRepositoryAdapter implements IRoleRepository {
    private readonly repository: Repository<Role>;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: RoleRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Role>> {
        const qb = this.repository.createQueryBuilder('role');
        qb.groupBy('role.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'role',
            fields: {
                allowed: [
                    'id',
                    'name',
                    'display_name',
                    'target',
                    'description',
                    'realm_id',
                    'created_at',
                    'updated_at',
                ],
            },
            filters: { allowed: ['id', 'name', 'target', 'realm_id'] },
            pagination: { maxLimit: 50 },
            sort: { allowed: ['id', 'name', 'updated_at', 'created_at'] },
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

    findOneById(id: string): Promise<Role | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Role | null> {
        const qb = this.repository.createQueryBuilder('role');
        qb.where('role.name = :name', { name });

        if (realmKey) {
            const realm = await this.realmRepository.resolve(realmKey);
            if (realm) {
                qb.andWhere('role.realm_id = :realmId', { realmId: realm.id });
            }
        }

        return qb.getOne();
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Role | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<Role[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<Role | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<Role>): Role {
        return this.repository.create(data);
    }

    merge(entity: Role, data: Partial<Role>): Role {
        return this.repository.merge(entity, data);
    }

    async save(entity: Role): Promise<Role> {
        return this.repository.save(entity);
    }

    async remove(entity: Role): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<Role>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: RoleEntity,
        });
    }

    async checkUniqueness(data: Partial<Role>, existing?: Role): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: RoleEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }

    async getBoundPermissions(entity: string | Role): Promise<PermissionPolicyBinding[]> {
        const id = typeof entity === 'string' ? entity : entity.id;
        return loadBoundPermissions({
            manager: this.repository.manager,
            junctionTarget: RolePermissionEntity,
            where: { role_id: id },
            cachePrefix: CachePrefix.ROLE_OWNED_PERMISSIONS,
            cacheKey: id,
        });
    }

    async getBoundPermissionsForMany(entities: (string | Role)[]): Promise<PermissionPolicyBinding[]> {
        const results = await Promise.all(entities.map((entity) => this.getBoundPermissions(entity)));
        return results.flat();
    }
}
