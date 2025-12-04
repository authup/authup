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
import type { IClientIdentityRepository } from '../../../../core';
import { CachePrefix, ClientRepository } from '../../domains';

export class ClientIdentityRepository implements IClientIdentityRepository {
    async findById(id: string): Promise<Client | null> {
        return this.find(id);
    }

    async findByName(id: string, realm?: string): Promise<Client | null> {
        return this.find(id, realm);
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
