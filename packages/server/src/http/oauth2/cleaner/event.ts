import { Cache, useClient } from 'redis-extension';
import { useDataSource } from 'typeorm-extension';
import { useLogger } from '@authup/server-common';
import { CachePrefix, OAuth2AuthorizationCodeEntity, OAuth2RefreshTokenEntity } from '../../../database';

export async function runOAuth2CleanerByEvent() {
    const redis = useClient();

    const authorizationCodeCache = new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_AUTHORIZATION_CODE });
    authorizationCodeCache.on('expired', async (data) => {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);
        await repository.delete(data.id);

        useLogger().debug(`Removing expired authorization-code: #${data.id}`);
    });

    await authorizationCodeCache.start();

    // -------------------------------------------------

    const refreshTokenCache = new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_REFRESH_TOKEN });
    refreshTokenCache.on('expired', async (data) => {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        await repository.delete(data.id);

        useLogger().info(`Removing expired refresh-token: #${data.id}`);
    });

    await refreshTokenCache.start();
}
