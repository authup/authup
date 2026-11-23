/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import type { IOAuth2ClientRepository, IRealmRepository } from '../../../../../core/index.ts';

export class OAuth2ClientRepository implements IOAuth2ClientRepository {
    private readonly repository: Repository<Client>;

    private readonly realmRepository: Pick<IRealmRepository, 'resolveId'>;

    constructor(
        repository: Repository<Client>,
        realmRepository: Pick<IRealmRepository, 'resolveId'>,
    ) {
        this.repository = repository;
        this.realmRepository = realmRepository;
    }

    /**
     * A uuid-shaped key is tried as an id first and, on a miss with a realm
     * key, as a name (a name may be shaped like a uuid, and names are unique
     * per realm only). An id match wins. The realm key is resolved once (an
     * id first, then a name) and a key naming no realm matches nothing.
     */
    async findOneByIdOrName(key: string, realmKey?: string): Promise<Client | null> {
        if (isUUID(key)) {
            const entity = await this.buildQuery()
                .where('client.id = :id', { id: key })
                .getOne();

            if (entity || !realmKey) {
                return entity;
            }
        }

        const query = this.buildQuery()
            .where('client.name = :name', { name: key.trim().toLowerCase() });

        if (realmKey) {
            const realmId = await this.realmRepository.resolveId(realmKey);

            if (!realmId) {
                return null;
            }

            query.andWhere('client.realmId = :realmId', { realmId });
        }

        return query.getOne();
    }

    private buildQuery() {
        return this.repository.createQueryBuilder('client')
            .leftJoinAndSelect('client.realm', 'realm');
    }
}
