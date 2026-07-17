/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TrustAnchor } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';
import type { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { applyQuery, validateEntityJoinColumns } from 'typeorm-extension';
import { DatabaseConflictError, RealmEntity, TrustAnchorEntity } from '../../../../../adapters/database/index.ts';
import type { IRealmRepository, ITrustAnchorRepository } from '../../../../../core/index.ts';
import { applyRealmScopeSelect, isEntityUnique, translateWhereConditions } from '../helpers.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export class TrustAnchorRepositoryAdapter implements ITrustAnchorRepository {
    protected dataSource: DataSource;

    protected realmRepository: IRealmRepository;

    constructor(dataSource: DataSource) {
        this.dataSource = dataSource;
        this.realmRepository = new RealmRepositoryAdapter(dataSource.getRepository(RealmEntity));
    }

    protected get repository(): Repository<TrustAnchorEntity> {
        return this.dataSource.getRepository(TrustAnchorEntity);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<TrustAnchor>> {
        const qb = this.repository.createQueryBuilder('trustAnchor');
        qb.groupBy('trustAnchor.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'trustAnchor',
            fields: {
                allowed: [
                    'id',
                    'name',
                    'certificate',
                    'enabled',
                    'realmId',
                    'createdAt',
                    'updatedAt',
                ],
            },
            filters: { allowed: ['id', 'name', 'enabled', 'realmId'] },
            pagination: { maxLimit: 50 },
            sort: { allowed: ['id', 'name', 'enabled', 'createdAt', 'updatedAt'] },
        });

        applyRealmScopeSelect(qb, 'trustAnchor');

        const [entities, total] = await qb.getManyAndCount();

        return {
            data: entities,
            meta: {
                total,
                ...pagination,
            },
        };
    }

    async findOneById(id: string): Promise<TrustAnchor | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<TrustAnchor | null> {
        const where: FindOptionsWhere<TrustAnchorEntity> = { name };

        if (realmKey) {
            const realmId = await this.realmRepository.resolveId(realmKey);
            if (!realmId) {
                return null;
            }

            where.realmId = realmId;
        }

        return this.repository.findOneBy(where);
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<TrustAnchor | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<TrustAnchor[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<TrustAnchor | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<TrustAnchor>): TrustAnchor {
        return this.repository.create(data);
    }

    merge(entity: TrustAnchor, data: Partial<TrustAnchor>): TrustAnchor {
        return this.repository.merge(entity as TrustAnchorEntity, data);
    }

    async save(entity: TrustAnchor): Promise<TrustAnchor> {
        return this.repository.save(entity as TrustAnchorEntity);
    }

    async remove(entity: TrustAnchor): Promise<void> {
        await this.repository.remove(entity as TrustAnchorEntity);
    }

    async validateJoinColumns(data: Partial<TrustAnchor>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.dataSource,
            entityTarget: TrustAnchorEntity,
        });
    }

    async checkUniqueness(data: Partial<TrustAnchor>, existing?: TrustAnchor): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.dataSource,
            entityTarget: TrustAnchorEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }
}
