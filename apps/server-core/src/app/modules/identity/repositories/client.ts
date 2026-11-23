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
import type { IClientIdentityRepository, IRealmRepository } from '../../../../core/index.ts';
import type { IQueryCache } from '../../database/index.ts';
import { buildIdentityQuery, findIdentityByName } from './helpers.ts';

export class ClientIdentityRepository implements IClientIdentityRepository {
    private readonly repository: Repository<Client>;

    private readonly cache: IQueryCache;

    private readonly realmRepository: Pick<IRealmRepository, 'resolveId'>;

    constructor(
        repository: Repository<Client>,
        cache: IQueryCache,
        realmRepository: Pick<IRealmRepository, 'resolveId'>,
    ) {
        this.repository = repository;
        this.cache = cache;
        this.realmRepository = realmRepository;
    }

    async findOneById(id: string): Promise<Client | null> {
        return isUUID(id) ? this.findById(id) : null;
    }

    async findOneByName(name: string, realm?: string): Promise<Client | null> {
        return this.findByName(name, realm);
    }

    /**
     * A uuid-shaped key is tried as an id first and, on a miss, as a name:
     * a name may be shaped like a uuid. An id match wins.
     */
    async findOneByIdOrName(idOrName: string, realm?: string): Promise<Client | null> {
        if (isUUID(idOrName)) {
            const entity = await this.findById(idOrName);

            if (entity) {
                return entity;
            }
        }

        return this.findByName(idOrName, realm);
    }

    async findOneBy(where: Record<string, any>): Promise<Client | null> {
        return this.repository.findOneBy(where);
    }

    private async findById(id: string) : Promise<Client | null> {
        // A uuid compares case-insensitively on the server dialects, so it is
        // canonicalized here: one cache key serves every spelling.
        const key = id.toLowerCase();
        const query = this.buildQuery().where('client.id = :id', { id: key });

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

    private async findByName(name: string, realmKey?: string) : Promise<Client | null> {
        const entity = await findIdentityByName({
            repository: this.repository,
            alias: 'client',
            realmRepository: this.realmRepository,
        }, name, realmKey);

        return entity || null;
    }

    private buildQuery() {
        return buildIdentityQuery(this.repository, 'client');
    }
}
