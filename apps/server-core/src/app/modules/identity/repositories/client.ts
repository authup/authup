/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import type { Client } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import { buildCollectionTag, buildRecordTag } from '@rapiq/cache';
import type { Repository } from 'typeorm';
import type { IClientIdentityRepository } from '../../../../core/index.ts';
import type { IQueryCache } from '../../database/index.ts';

export class ClientIdentityRepository implements IClientIdentityRepository {
    private readonly repository: Repository<Client>;

    private readonly cache: IQueryCache;

    constructor(repository: Repository<Client>, cache: IQueryCache) {
        this.repository = repository;
        this.cache = cache;
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

    private async find(input: string, realmKey?: string) : Promise<Client | null> {
        const query = this.repository.createQueryBuilder('client')
            .leftJoinAndSelect('client.realm', 'realm');

        // A uuid compares case-insensitively on the server dialects, so it is
        // canonicalized here: one cache key serves every spelling.
        const isId = isUUID(input);
        const key = isId ? input.toLowerCase() : input;

        if (isId) {
            query.where('client.id = :id', { id: key });
        } else {
            query.where('client.name = :name', { name: key.trim().toLowerCase() });

            if (realmKey) {
                if (isUUID(realmKey)) {
                    query.andWhere('client.realmId = :realmId', { realmId: realmKey });
                } else {
                    query.andWhere('realm.name = :realmName', { realmName: realmKey.trim().toLowerCase() });
                }
            }
        }

        const { columns } = this.repository.metadata;

        for (const column of columns) {
            if (!column.isSelect) {
                query.addSelect(`client.${column.propertyName}`);
            }
        }

        if (!isId) {
            return query.getOne();
        }

        // the path unwind updates clients by criteria, which bumps the collection tag alone
        return this.cache.remember(
            `identity/client/${key}`,
            (value) => [
                buildCollectionTag(EntityType.CLIENT),
                ...(value ? [buildRecordTag(EntityType.REALM, value.realmId)] : []),
            ],
            () => query.getOne(),
            { manager: this.repository.manager },
        );
    }
}
