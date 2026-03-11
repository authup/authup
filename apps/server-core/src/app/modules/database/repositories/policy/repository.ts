/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IPolicyRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import type { PolicyRepository } from '../../../../../adapters/database/domains/index.ts';
import {
    PolicyEntity,
    resolveRealm,
} from '../../../../../adapters/database/domains/index.ts';

export class PolicyRepositoryAdapter implements IPolicyRepository {
    private readonly repository: PolicyRepository;

    constructor(repository: PolicyRepository) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Policy>> {
        const qb = this.repository.createQueryBuilder('policy');
        qb.groupBy('policy.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'policy',
            relations: {
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error onJoin is not in the type definition
                allowed: ['id', 'name', 'type', 'parent_id', 'realm_id', 'realm.name'],
            },
            sort: {
                allowed: ['id', 'created_at', 'updated_at'],
            },
            pagination: {
                maxLimit: 50,
            },
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
            await this.repository.extendOneWithEA(entity as PolicyEntity);
        }
        return entity;
    }

    async findOneByName(name: string, realmKey?: string): Promise<Policy | null> {
        const qb = this.repository.createQueryBuilder('policy');
        qb.where('policy.name LIKE :name', { name });

        if (realmKey) {
            const realm = await resolveRealm(realmKey);
            if (realm) {
                qb.andWhere('policy.realm_id = :realmId', { realmId: realm.id });
            }
        }

        const entity = await qb.getOne();
        if (entity) {
            await this.repository.extendOneWithEA(entity as PolicyEntity);
        }
        return entity;
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Policy | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findOneBy(where: Record<string, any>): Promise<Policy | null> {
        return this.repository.findOneBy(where);
    }

    create(data: Partial<Policy>): Policy {
        return this.repository.create(data);
    }

    merge(entity: Policy, data: Partial<Policy>): Policy {
        return this.repository.merge(entity as PolicyEntity, data);
    }

    async save(entity: Policy): Promise<Policy> {
        return this.repository.save(entity as PolicyEntity);
    }

    async remove(entity: Policy): Promise<void> {
        await this.repository.remove(entity as PolicyEntity);
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
        await this.repository.saveOneWithEA(entity as PolicyEntity, data);
        await this.repository.updateClosureTable(entity as PolicyEntity);

        return entity;
    }

    async deleteFromTree(entity: Policy): Promise<void> {
        const treeRepository = this.repository.manager.connection.getTreeRepository(PolicyEntity);
        await treeRepository.remove(entity as PolicyEntity);
    }
}
