/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Realm, Scope } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IRealmRepository, IScopeRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import { translateWhereConditions } from '../helpers.ts';
import { ScopeEntity } from '../../../../../adapters/database/domains/index.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type ScopeRepositoryAdapterContext = {
    repository: Repository<Scope>,
    realmRepository: Repository<Realm>,
};

export class ScopeRepositoryAdapter implements IScopeRepository {
    private readonly repository: Repository<Scope>;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: ScopeRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Scope>> {
        const qb = this.repository.createQueryBuilder('scope');
        qb.groupBy('scope.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'scope',
            fields: {
                allowed: [
                    'id',
                    'built_in',
                    'name',
                    'display_name',
                    'description',
                    'realm_id',
                    'created_at',
                    'updated_at',
                ],
            },
            filters: {
                allowed: ['id', 'built_in', 'name', 'realm_id'],
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

    findOneById(id: string): Promise<Scope | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Scope | null> {
        const qb = this.repository.createQueryBuilder('scope');
        qb.where('scope.name LIKE :name', { name });

        if (realmKey) {
            const realm = await this.realmRepository.resolve(realmKey);
            if (realm) {
                qb.andWhere('scope.realm_id = :realmId', { realmId: realm.id });
            }
        }

        return qb.getOne();
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Scope | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<Scope[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<Scope | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<Scope>): Scope {
        return this.repository.create(data);
    }

    merge(entity: Scope, data: Partial<Scope>): Scope {
        return this.repository.merge(entity, data);
    }

    async save(entity: Scope): Promise<Scope> {
        return this.repository.save(entity);
    }

    async remove(entity: Scope): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<Scope>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: ScopeEntity,
        });
    }

    async checkUniqueness(data: Partial<Scope>, existing?: Scope): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: ScopeEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }
}
