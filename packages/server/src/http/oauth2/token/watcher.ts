/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Cache, Client, useClient } from 'redis-extension';
import { getRepository } from 'typeorm';
import { OAuth2TokenKind } from '@typescript-auth/domains';
import { OAuth2AccessTokenEntity } from '../../../domains/oauth2-access-token';
import { OAuth2RefreshTokenEntity } from '../../../domains/oauth2-refresh-token';

export async function startOAuth2TokenWatcher(redis: Client | boolean) {
    if (!redis) {
        return;
    }

    const client : Client = typeof redis === 'boolean' ?
        useClient() :
        redis;

    // -------------------------------------------------

    const accessTokenRepository = getRepository(OAuth2AccessTokenEntity);
    const accessTokenCache = new Cache<string>({
        redis: client,
    }, {
        prefix: OAuth2TokenKind.ACCESS,
    });
    accessTokenCache.on('expired', async (data) => {
        await accessTokenRepository.delete(data.id);
    });

    // -------------------------------------------------

    const refreshTokenRepository = getRepository(OAuth2RefreshTokenEntity);
    const refreshTokenCache = new Cache<string>({
        redis: client,
    }, {
        prefix: OAuth2TokenKind.REFRESH,
    });
    refreshTokenCache.on('expired', async (data) => {
        await refreshTokenRepository.delete(data.id);
    });

    // -------------------------------------------------

    await accessTokenCache.startScheduler();
    await refreshTokenCache.startScheduler();
}
