/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@typescript-error/http';
import { OAuth2AbstractCache } from './abstract';
import { OAuth2AccessTokenEntity } from '../../domains';
import { useDataSource } from '../../database';
import { CachePrefix } from '../../constants';

export class OAuth2AccessTokenCache extends OAuth2AbstractCache<OAuth2AccessTokenEntity> {
    constructor() {
        super(CachePrefix.OAUTH2_ACCESS_TOKEN);
    }

    async deleteDBEntity(id: OAuth2AccessTokenEntity['id']): Promise<void> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AccessTokenEntity);
        await repository.delete(id);
    }

    async loadDBEntity(id: OAuth2AccessTokenEntity['id']): Promise<OAuth2AccessTokenEntity> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AccessTokenEntity);
        const entity = await repository.findOneBy({ id });

        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }
}
