/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import type { Repository } from 'typeorm';
import type { IOAuth2ClientRepository } from '../../../../../core';

export class OAuth2ClientRepository implements IOAuth2ClientRepository {
    private readonly repository: Repository<Client>;

    constructor(
        repository: Repository<Client>,
    ) {
        this.repository = repository;
    }

    async findOneByIdOrName(key: string, realmKey?: string): Promise<Client | null> {
        const query = this.repository.createQueryBuilder('client')
            .leftJoinAndSelect('client.realm', 'realm');

        if (isUUID(key)) {
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

        return query.getOne();
    }
}
