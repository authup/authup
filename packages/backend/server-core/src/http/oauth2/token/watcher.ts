/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Cache, Client } from 'redis-extension';
import { getRepository } from 'typeorm';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';
import { useRedisClient } from '../../../utils';
import { CachePrefix } from '../../../config/constants';

export async function startOAuth2TokenWatcher(redis?: Client | boolean | string) {
    redis = useRedisClient(redis);

    if (!redis) {
        return;
    }

    // -------------------------------------------------

    const accessTokenCache = new Cache<string>({
        redis,
    }, {
        prefix: CachePrefix.TOKEN_ACCESS,
    });
    accessTokenCache.on('expired', async (data) => {
        const accessTokenRepository = getRepository(OAuth2AccessTokenEntity);
        await accessTokenRepository.delete(data.id);
    });

    // -------------------------------------------------

    const refreshTokenCache = new Cache<string>({
        redis,
    }, {
        prefix: CachePrefix.TOKEN_REFRESH,
    });
    refreshTokenCache.on('expired', async (data) => {
        const refreshTokenRepository = getRepository(OAuth2RefreshTokenEntity);
        await refreshTokenRepository.delete(data.id);
    });

    // -------------------------------------------------

    await accessTokenCache.startScheduler();
    await refreshTokenCache.startScheduler();
}
