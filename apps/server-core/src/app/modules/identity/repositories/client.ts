/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { buildRedisKeyPath } from '@authup/server-kit';
import { isUUID } from '@authup/kit';
import type { Client } from '@authup/core-kit';
import type { IClientIdentityRepository } from '../../../../core/index.ts';
import type { ClientRepository } from '../../../../adapters/database/domains/index.ts';
import { CachePrefix } from '../../../../adapters/database/domains/index.ts';

export class ClientIdentityRepository implements IClientIdentityRepository {
    private readonly repository: ClientRepository;

    constructor(repository: ClientRepository) {
        this.repository = repository;
    }

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
        return this.repository.findOneBy(where);
    }

    private async find(key: string, realmKey?: string) : Promise<Client | null> {
        const query = this.repository.createQueryBuilder('client')
            .leftJoinAndSelect('client.realm', 'realm');

        const isId = isUUID(key);
        if (isId) {
            query.where('client.id = :id', { id: key });
        } else {
            query.where('client.name = :name', { name: key });

            if (realmKey) {
                if (isUUID(realmKey)) {
                    query.andWhere('client.realm_id = :realmId', { realmId: realmKey });
                } else {
                    query.andWhere('realm.name = :realmName', { realmName: realmKey });
                }
            }
        }
        const { columns } = this.repository.metadata;
        for (const column of columns) {
            if (!column.isSelect) {
                query.addSelect(`client.${column.databaseName}`);
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
