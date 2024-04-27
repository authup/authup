/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { NotFoundError } from '@ebec/http';
import { useDataSource } from 'typeorm-extension';
import { CachePrefix, OAuth2RefreshTokenEntity } from '../../../domains';
import { OAuth2AbstractCache } from './abstract';

export class OAuth2RefreshTokenCache extends OAuth2AbstractCache<OAuth2RefreshTokenEntity> {
    constructor() {
        super(CachePrefix.OAUTH2_REFRESH_TOKEN);
    }

    async deleteDBEntity(id: OAuth2RefreshTokenEntity['id']): Promise<void> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        await repository.delete(id);
    }

    async loadDBEntity(id: OAuth2RefreshTokenEntity['id']): Promise<OAuth2RefreshTokenEntity> {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        const entity = await repository.findOneBy({ id });

        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }
}
