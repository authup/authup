/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { CachePrefix, OAuth2AuthorizationCodeEntity } from '@authup/server-database';
import { OAuth2AbstractCache } from './abstract';

export class OAuth2AuthorizationCodeCache extends OAuth2AbstractCache<OAuth2AuthorizationCodeEntity> {
    constructor() {
        super(CachePrefix.OAUTH2_AUTHORIZATION_CODE);
    }

    async deleteDBEntity(id: OAuth2AuthorizationCodeEntity['id']): Promise<void> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);
        await repository.delete(id);
    }

    async loadDBEntity(id: OAuth2AuthorizationCodeEntity['id']): Promise<OAuth2AuthorizationCodeEntity> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);
        const entity = await repository.findOneBy({ id });

        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }
}
