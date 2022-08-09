/*
 * Copyright (c) 2021-2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DataSource, EntityManager, InstanceChecker, Repository,
} from 'typeorm';
import { OAuth2ClientEntity } from './entity';

export class OAuth2ClientRepository extends Repository<OAuth2ClientEntity> {
    constructor(instance: DataSource | EntityManager) {
        super(OAuth2ClientEntity, InstanceChecker.isDataSource(instance) ? instance.manager : instance);
    }

    /**
     * Verify a client by id and secret.
     *
     * @param id
     * @param secret
     */
    async verifyCredentials(id: string, secret: string) : Promise<OAuth2ClientEntity | undefined> {
        const entity = await this.createQueryBuilder('client')
            .addSelect('client.secret')
            .where('client.id = :id', { id })
            .getOne();

        if (
            !entity ||
            !entity.secret
        ) {
            return undefined;
        }

        if (secret !== entity.secret) {
            return undefined;
        }

        return entity;
    }
}
