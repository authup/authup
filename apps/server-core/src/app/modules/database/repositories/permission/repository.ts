/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Permission, Realm } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { validateEntityJoinColumns } from 'typeorm-extension';
import { applyQuery, redactFieldConditions } from '../query.ts';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { IPermissionRepository, IRealmRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { isEntityUnique, translateWhereConditions } from '../helpers.ts';
import { PermissionEntity } from '../../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type PermissionRepositoryAdapterContext = {
    repository: Repository<Permission>,
    realmRepository: Repository<Realm>,
};

export class PermissionRepositoryAdapter implements IPermissionRepository {
    private readonly repository: Repository<Permission>;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: PermissionRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
    }

    async findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<Permission>> {
        const qb = this.repository.createQueryBuilder('permission');
        qb.groupBy('permission.id');

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

    findOneById(id: string): Promise<Permission | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Permission | null> {
        const qb = this.repository.createQueryBuilder('permission');
        qb.where('permission.name = :name', { name });

        if (realmKey) {
            const realmId = await this.realmRepository.resolveId(realmKey);
            if (!realmId) {
                return null;
            }
            qb.andWhere('permission.realmId = :realmId', { realmId });
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
        return this.repository.create(data);
    }

    merge(entity: Permission, data: Partial<Permission>): Permission {
        return this.repository.merge(entity, data);
    }

    async save(entity: Permission): Promise<Permission> {
        return this.repository.save(entity);
    }

    async remove(entity: Permission): Promise<void> {
        await this.repository.remove(entity);
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
}
