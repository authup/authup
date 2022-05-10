/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Cache, useClient } from 'redis-extension';
import {
    OAuth2AccessTokenEntity,
    OAuth2RefreshTokenEntity,
} from '../../../domains';
import { useDataSource } from '../../../database';
import { CachePrefix } from '../../../redis';
import { useConfig } from '../../../config';

export async function startOAuth2TokenWatcher() {
    const config = await useConfig();
    if (!config.redis.enabled) {
        return;
    }

    const redis = useClient(config.redis.alias);

    const accessTokenCache = new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_ACCESS_TOKEN });
    accessTokenCache.on('expired', async (data) => {
        const dataSource = await useDataSource();
        const accessTokenRepository = dataSource.getRepository(OAuth2AccessTokenEntity);
        await accessTokenRepository.delete(data.id);
    });

    await accessTokenCache.startScheduler();

    // -------------------------------------------------

    const refreshTokenCache = new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_REFRESH_TOKEN });
    refreshTokenCache.on('expired', async (data) => {
        const dataSource = await useDataSource();
        const refreshTokenRepository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        await refreshTokenRepository.delete(data.id);
    });

    await refreshTokenCache.startScheduler();
}
