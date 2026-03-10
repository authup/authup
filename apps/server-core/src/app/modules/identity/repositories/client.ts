/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { buildRedisKeyPath } from '@authup/server-kit';
import { useDataSource } from 'typeorm-extension';
import { isUUID } from '@authup/kit';
import type { Client } from '@authup/core-kit';
import type { EntityRepositoryFindManyResult, IClientIdentityRepository } from '../../../../core/index.ts';
import { CachePrefix, ClientRepository } from '../../../../adapters/database/domains/index.ts';

export class ClientIdentityRepository implements IClientIdentityRepository {
    async findOneById(id: string): Promise<Client | null> {
        return this.find(id);
    }

    async findOneByName(id: string, realm?: string): Promise<Client | null> {
        return this.find(id, realm);
    }

    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Client | null> {
        return this.find(idOrName, realm);
    }

    async findOneBy(where: Record<string, any>): Promise<Client | null> {
        const dataSource = await useDataSource();
        const repository = new ClientRepository(dataSource);
        return repository.findOneBy(where);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async findMany(query: Record<string, any>): Promise<EntityRepositoryFindManyResult<Client>> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    create(data: Partial<Client>): Client {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    merge(entity: Client, data: Partial<Client>): Client {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async save(entity: Client): Promise<Client> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async remove(entity: Client): Promise<void> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async validateJoinColumns(data: Partial<Client>): Promise<void> {
        throw new Error('Method not implemented.');
    }

    private async find(key: string, realmKey?: string) : Promise<Client | null> {
        const dataSource = await useDataSource();
        const repository = new ClientRepository(dataSource);
        const query = repository.createQueryBuilder('client')
            .leftJoinAndSelect('client.realm', 'realm');

        const isId = isUUID(key);
        if (isId) {
            query.where('client.id = :id', { id: key });
        } else {
            query.where('client.name = :name', { name: key });

            if (realmKey) {
                if (isUUID(realmKey)) {
                    query.andWhere('client.realm_id = :realmId', {
                        realmId: realmKey,
                    });
                } else {
                    query.andWhere('realm.name = :realmName', {
                        realmName: realmKey,
                    });
                }
            }
        }
        const { columns } = repository.metadata;
        for (let i = 0; i < columns.length; i++) {
            if (!columns[i].isSelect) {
                query.addSelect(`client.${columns[i].databaseName}`);
            }
        }

        if (isId) {
            query.cache(
                buildRedisKeyPath({
                    prefix: CachePrefix.CLIENT,
                    key,
                }),
                60_000,
            );
        }

        return query.getOne();
    }
}
