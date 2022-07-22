import { Cache, useClient } from 'redis-extension';
import { CachePrefix } from '../../../constants';
import { useDataSource } from '../../../database';
import { OAuth2AccessTokenEntity, OAuth2AuthorizationCodeEntity, OAuth2RefreshTokenEntity } from '../../../domains';
import { Logger } from '../../../config';

export async function runOAuth2CleanerByEvent(logger?: Logger) {
    const redis = useClient();

    const authorizationCodeCache = new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_ACCESS_TOKEN });
    authorizationCodeCache.on('expired', async (data) => {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);
        await repository.delete(data.id);

        if (logger) {
            logger.info(`Removing expired authorization-code: #${data.id}`);
        }
    });

    await authorizationCodeCache.startScheduler();

    // -------------------------------------------------

    const accessTokenCache = new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_ACCESS_TOKEN });
    accessTokenCache.on('expired', async (data) => {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2AccessTokenEntity);
        await repository.delete(data.id);

        if (logger) {
            logger.info(`Removing expired access-token: #${data.id}`);
        }
    });

    await accessTokenCache.startScheduler();

    // -------------------------------------------------

    const refreshTokenCache = new Cache<string>({ redis }, { prefix: CachePrefix.OAUTH2_REFRESH_TOKEN });
    refreshTokenCache.on('expired', async (data) => {
        const dataSource = await useDataSource();
        const repository = dataSource.getRepository(OAuth2RefreshTokenEntity);
        await repository.delete(data.id);

        if (logger) {
            logger.info(`Removing expired refresh-token: #${data.id}`);
        }
    });

    await refreshTokenCache.startScheduler();
}
