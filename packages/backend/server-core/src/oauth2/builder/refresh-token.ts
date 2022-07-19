/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2RefreshTokenEntity } from '../../domains';
import { OAuth2RefreshTokenBuilderContext, OAuth2RefreshTokenBuilderCreateContext } from './type';
import { useDataSource } from '../../database';
import { OAuth2RefreshTokenCache } from '../cache';

export class Oauth2RefreshTokenBuilder {
    protected context : OAuth2RefreshTokenBuilderContext;

    // -----------------------------------------------------

    constructor(context: OAuth2RefreshTokenBuilderContext) {
        this.context = context;
    }

    async create(context: OAuth2RefreshTokenBuilderCreateContext) : Promise<OAuth2RefreshTokenEntity> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);

        const entity = repository.create({
            client_id: context.accessToken.client_id,
            expires: new Date(Date.now() + (1000 * (this.context.maxAge || 7200))),
            scope: context.accessToken.scope,
            access_token_id: context.accessToken.id,
            realm_id: context.accessToken.realm_id,
        });

        await repository.insert(entity);

        const cache = new OAuth2RefreshTokenCache();
        await cache.set(entity);

        return entity;
    }
}
