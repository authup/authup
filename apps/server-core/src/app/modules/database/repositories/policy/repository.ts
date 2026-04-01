/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy, Realm } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IPolicyRepository, IRealmRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import type { PolicyRepository } from '../../../../../adapters/database/domains/index.ts';
import { PolicyEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type PolicyRepositoryAdapterContext = {
    repository: PolicyRepository,
    realmRepository: Repository<Realm>,
};

export class PolicyRepositoryAdapter implements IPolicyRepository {
    private readonly repository: PolicyRepository;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: PolicyRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Policy>> {
        const qb = this.repository.createQueryBuilder('policy');
        qb.groupBy('policy.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'policy',
            relations: {
                // @ts-expect-error onJoin is not in the type definition
                allowed: ['children', 'realm'],
                onJoin: (_property: string, key: string, q: any) => {
                    q.addGroupBy(`${key}.id`);
                },
            },
            fields: {
                default: [
                    'id',
                    'built_in',
                    'type',
                    'display_name',
                    'name',
                    'description',
                    'invert',
                    'parent_id',
                    'realm_id',
                    'created_at',
                    'updated_at',
                ],
            },
            filters: {
                // @ts-expect-error realm.name filter requires relation join
                allowed: ['id', 'name', 'type', 'parent_id', 'realm_id', 'realm.name'],
            },
            sort: { allowed: ['id', 'created_at', 'updated_at'] },
            pagination: { maxLimit: 50 },
        });

        const [entities, total] = await qb.getManyAndCount();
        await this.repository.extendManyWithEA(entities);

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneById(id: string): Promise<Policy | null> {
        const entity = await this.findOneBy({ id });
        if (entity) {
            await this.repository.extendOneWithEA(entity);
        }
        return entity;
    }

    async findOneByName(name: string, realmKey?: string): Promise<Policy | null> {
        const qb = this.repository.createQueryBuilder('policy');
        qb.where('policy.name LIKE :name', { name });

        if (realmKey) {
            const realm = await this.realmRepository.resolve(realmKey);
            if (realm) {
                qb.andWhere('policy.realm_id = :realmId', { realmId: realm.id });
            }
        }

        const entity = await qb.getOne();
        if (entity) {
            await this.repository.extendOneWithEA(entity);
        }
        return entity;
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Policy | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<Policy[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<Policy | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<Policy>): Policy {
        return this.repository.create(data);
    }

    merge(entity: Policy, data: Partial<Policy>): Policy {
        return this.repository.merge(entity, data);
    }

    async save(entity: Policy): Promise<Policy> {
        return this.repository.save(entity);
    }

    async remove(entity: Policy): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<Policy>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: PolicyEntity,
        });
    }

    async checkUniqueness(data: Partial<Policy>, existing?: Policy): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: PolicyEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }

    async saveWithEA(entity: Policy, data?: Record<string, any>): Promise<Policy> {
        await this.repository.saveOneWithEA(entity, data);
        await this.repository.updateClosureTable(entity, this.repository.manager);

        return entity;
    }

    async deleteFromTree(entity: Policy): Promise<void> {
        const treeRepository = this.repository.manager.connection.getTreeRepository(PolicyEntity);
        await treeRepository.remove(entity);
    }
}
