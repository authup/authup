/*
 * Copyright (c) 2025.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { ClientError } from '@authup/core-kit';
import { isUUID } from '@authup/kit';
import { useDataSource } from 'typeorm-extension';
import { ClientCredentialsService } from '../../../credential';
import { BaseAuthenticationService } from '../../base';
import type { ClientEntity } from '../../../../database/domains';
import { ClientRepository } from '../../../../database/domains';

export class ClientAuthenticationService extends BaseAuthenticationService<ClientEntity> {
    protected credentialsService : ClientCredentialsService;

    constructor() {
        super();

        this.credentialsService = new ClientCredentialsService();
    }

    async authenticate(name: string | ClientEntity, secret: string, realmId?: string): Promise<ClientEntity> {
        let entity : ClientEntity;
        if (typeof name === 'string') {
            entity = await this.resolve(name, realmId);

            if (!entity) {
                throw ClientError.credentialsInvalid();
            }
        } else {
            entity = name;
        }

        if (entity.is_confidential) {
            const verified = await this.credentialsService.verify(secret, entity);
            if (!verified) {
                throw ClientError.credentialsInvalid();
            }
        } else {
            throw ClientError.invalid();
        }

        if (!entity.active) {
            throw ClientError.inactive();
        }

        return entity;
    }

    async resolve(key: string, realmKey?: string): Promise<ClientEntity> {
        const dataSource = await useDataSource();
        const repository = new ClientRepository(dataSource);
        const query = repository.createQueryBuilder('client')
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

        query.addSelect('client.secret');

        return query.getOne();
    }
}
