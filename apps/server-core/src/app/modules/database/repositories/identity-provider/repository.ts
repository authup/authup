/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IdentityProvider, IdentityProviderProtocol, Realm } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IIdentityProviderRepository, IRealmRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import type { IdentityProviderRepository } from '../../../../../adapters/database/domains/index.ts';
import { IdentityProviderEntity } from '../../../../../adapters/database/domains/index.ts';
import { translateWhereConditions } from '../helpers.ts';
import { RealmRepositoryAdapter } from '../realm/repository.ts';

export type IdentityProviderRepositoryAdapterContext = {
    repository: IdentityProviderRepository,
    realmRepository: Repository<Realm>,
};

export class IdentityProviderRepositoryAdapter implements IIdentityProviderRepository {
    private readonly repository: IdentityProviderRepository;

    private readonly realmRepository: IRealmRepository;

    constructor(ctx: IdentityProviderRepositoryAdapterContext) {
        this.repository = ctx.repository;
        this.realmRepository = new RealmRepositoryAdapter(ctx.realmRepository);
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<IdentityProvider>> {
        const qb = this.repository.createQueryBuilder('provider');
        qb.groupBy('provider.id');

        const {
            pagination 
        } = applyQuery(qb, query, {
            defaultAlias: 'provider',
            relations: {
                allowed: ['realm'],
                onJoin: (_property: string, key: string, q: any) => {
                    q.addGroupBy(`${key}.id`);
                },
            },
            fields: {
                default: [
                    'id',
                    'name',
                    'display_name',
                    'protocol',
                    'preset',
                    'enabled',
                    'realm_id',
                    'created_at',
                    'updated_at',
                ],
            },
            filters: {
                allowed: ['name', 'protocol', 'enabled', 'realm_id', 'realm.name'],
            },
            sort: {
                allowed: ['id', 'created_at', 'updated_at'],
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

    async findOneById(id: string): Promise<IdentityProvider | null> {
        const entity = await this.findOneBy({
            id 
        });
        if (entity) {
            await this.repository.extendOneWithEA(entity);
        }
        return entity;
    }

    async findOneByName(name: string, realmKey?: string): Promise<IdentityProvider | null> {
        const qb = this.repository.createQueryBuilder('provider');
        qb.where('provider.name = :name', {
            name 
        });

        if (realmKey) {
            const realm = await this.realmRepository.resolve(realmKey);
            if (realm) {
                qb.andWhere('provider.realm_id = :realmId', {
                    realmId: realm.id 
                });
            }
        }

        const entity = await qb.getOne();
        if (entity) {
            await this.repository.extendOneWithEA(entity);
        }
        return entity;
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<IdentityProvider | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findManyBy(where: Record<string, any>): Promise<IdentityProvider[]> {
        return this.repository.findBy(translateWhereConditions(where));
    }

    async findOneBy(where: Record<string, any>): Promise<IdentityProvider | null> {
        return this.repository.findOneBy(translateWhereConditions(where));
    }

    create(data: Partial<IdentityProvider>): IdentityProvider {
        return this.repository.create(data);
    }

    merge(entity: IdentityProvider, data: Partial<IdentityProvider>): IdentityProvider {
        return this.repository.merge(entity, data);
    }

    async save(entity: IdentityProvider): Promise<IdentityProvider> {
        return this.repository.save(entity);
    }

    async saveWithEA(entity: IdentityProvider, attributes?: Record<string, any>): Promise<IdentityProvider> {
        await this.repository.saveOneWithEA(entity, attributes);
        return entity;
    }

    async extendOneWithEA(entity: IdentityProvider): Promise<void> {
        await this.repository.extendOneWithEA(entity);
    }

    async remove(entity: IdentityProvider): Promise<void> {
        await this.repository.remove(entity);
    }

    async validateJoinColumns(data: Partial<IdentityProvider>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: IdentityProviderEntity,
        });
    }

    async checkUniqueness(data: Partial<IdentityProvider>, existing?: IdentityProvider): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: IdentityProviderEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }

    async findByProtocol(protocol: IdentityProviderProtocol, realmKey?: string): Promise<IdentityProvider[]> {
        const qb = this.repository.createQueryBuilder('provider');
        qb.where('provider.protocol = :protocol', {
            protocol 
        });

        if (realmKey) {
            const realm = await this.realmRepository.resolve(realmKey);
            if (realm) {
                qb.andWhere('provider.realm_id = :realmId', {
                    realmId: realm.id 
                });
            }
        }

        const entities = await qb.getMany();
        await this.repository.extendManyWithEA(entities);
        return entities;
    }
}
