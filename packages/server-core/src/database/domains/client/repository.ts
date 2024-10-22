/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isUUID } from '@authup/kit';
import type { DataSource, EntityManager } from 'typeorm';
import { InstanceChecker, Repository } from 'typeorm';
import { ClientEntity } from './entity';

export class ClientRepository extends Repository<ClientEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(ClientEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }

    /**
     * Verify a client by id and secret.
     *
     * @param idOrName
     * @param secret
     * @param realmId
     */
    async verifyCredentials(
        idOrName: string,
        secret: string,
        realmId?: string,
    ) : Promise<ClientEntity | undefined> {
        const query = this.createQueryBuilder('client')
            .leftJoinAndSelect('client.realm', 'realm');

        if (isUUID(idOrName)) {
            query.where('client.id = :id', { id: idOrName });
        } else {
            query.where('client.name LIKE :name', { name: idOrName });

            if (realmId) {
                query.andWhere('client.realm_id = :realmId', { realmId });
            }
        }

        const entities = await query
            .addSelect('client.secret')
            .getMany();

        for (let i = 0; i < entities.length; i++) {
            if (!entities[i].secret) {
                continue;
            }

            if (secret === entities[i].secret) {
                return entities[i];
            }
        }

        return undefined;
    }
}
