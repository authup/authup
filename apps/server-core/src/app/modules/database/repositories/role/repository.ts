/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Role } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IRoleRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { RoleEntity, resolveRealm } from '../../../../../adapters/database/domains/index.ts';

export class RoleRepositoryAdapter implements IRoleRepository {
    private readonly repository: Repository<Role>;

    constructor(repository: Repository<Role>) {
        this.repository = repository;
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
            filters: {
                allowed: ['id', 'name', 'target', 'realm_id'],
            },
            pagination: {
                maxLimit: 50,
            },
            sort: {
                allowed: ['id', 'name', 'updated_at', 'created_at'],
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

    findOneById(id: string): Promise<Role | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Role | null> {
        const qb = this.repository.createQueryBuilder('role');
        qb.where('role.name LIKE :name', { name });

        if (realmKey) {
            const realm = await resolveRealm(realmKey);
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

    async findOneBy(where: Record<string, any>): Promise<Role | null> {
        return this.repository.findOneBy(where);
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
        await this.repository.remove(entity as any);
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
}
