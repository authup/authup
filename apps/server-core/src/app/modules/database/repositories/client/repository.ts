/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import { applyQuery, isEntityUnique, validateEntityJoinColumns } from 'typeorm-extension';
import type { EntityRepositoryFindManyResult, IClientRepository } from '../../../../../core/index.ts';
import { DatabaseConflictError } from '../../../../../adapters/database/index.ts';
import {
    ClientEntity,
    resolveRealm,
} from '../../../../../adapters/database/domains/index.ts';

export class ClientRepositoryAdapter implements IClientRepository {
    private readonly repository: Repository<Client>;

    constructor(repository: Repository<Client>) {
        this.repository = repository;
    }

    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Client>> {
        const qb = this.repository.createQueryBuilder('client');
        qb.groupBy('client.id');

        const { pagination } = applyQuery(qb, query, {
            defaultAlias: 'client',
            fields: {
                default: [
                    'id',
                    'active',
                    'built_in',
                    'name',
                    'display_name',
                    'description',
                    'secret_hashed',
                    'secret_encrypted',
                    'base_url',
                    'root_url',
                    'redirect_uri',
                    'grant_types',
                    'scope',
                    'is_confidential',
                    'realm_id',
                    'updated_at',
                    'created_at',
                ],
                allowed: ['secret'],
            },
            filters: {
                allowed: ['id', 'name', 'realm_id', 'realm.name'],
            },
            pagination: {
                maxLimit: 50,
            },
            relations: {
                allowed: ['realm'],
                // @ts-expect-error onJoin is not in the type definition
                onJoin: (_property: string, key: string, q: any) => {
                    q.addGroupBy(`${key}.id`);
                },
            },
            sort: {
                allowed: ['id', 'created_at', 'updated_at'],
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

    findOneById(id: string): Promise<Client | null> {
        return this.findOneBy({ id });
    }

    async findOneByName(name: string, realmKey?: string): Promise<Client | null> {
        const qb = this.repository.createQueryBuilder('client');
        qb.where('client.name LIKE :name', { name });

        if (realmKey) {
            const realm = await resolveRealm(realmKey);
            if (realm) {
                qb.andWhere('client.realm_id = :realmId', { realmId: realm.id });
            }
        }

        return qb.getOne();
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Client | null> {
        return isUUID(idOrName) ?
            this.findOneById(idOrName) :
            this.findOneByName(idOrName, realm);
    }

    async findOneBy(where: Record<string, any>): Promise<Client | null> {
        return this.repository.findOneBy(where);
    }

    async findOneWithSecret(where: Record<string, any>): Promise<Client | null> {
        const qb = this.repository.createQueryBuilder('client');

        Object.entries(where).forEach(([key, value]) => {
            qb.andWhere(`client.${key} = :${key}`, { [key]: value });
        });

        qb.addSelect('client.secret');

        return qb.getOne();
    }

    create(data: Partial<Client>): Client {
        return this.repository.create(data);
    }

    merge(entity: Client, data: Partial<Client>): Client {
        return this.repository.merge(entity, data);
    }

    async save(entity: Client): Promise<Client> {
        return this.repository.save(entity);
    }

    async remove(entity: Client): Promise<void> {
        await this.repository.remove(entity as any);
    }

    async validateJoinColumns(data: Partial<Client>): Promise<void> {
        await validateEntityJoinColumns(data, {
            dataSource: this.repository.manager.connection,
            entityTarget: ClientEntity,
        });
    }

    async checkUniqueness(data: Partial<Client>, existing?: Client): Promise<void> {
        const isUnique = await isEntityUnique({
            dataSource: this.repository.manager.connection,
            entityTarget: ClientEntity,
            entity: data,
            entityExisting: existing,
        });

        if (!isUnique) {
            throw new DatabaseConflictError();
        }
    }
}
