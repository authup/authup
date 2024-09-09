import {
    RedisWatcher, parseRedisKeyPath, useLogger, useRedisClient,
} from '@authup/server-kit';
import { useDataSource } from 'typeorm-extension';
import { CachePrefix, OAuth2AuthorizationCodeEntity, OAuth2RefreshTokenEntity } from '../../domains';

export async function runOAuth2CleanerByEvent() {
    const redis = useRedisClient();
    const dataSource = await useDataSource();

    // -------------------------------------------------

    const authCodeRepository = dataSource.getRepository(OAuth2AuthorizationCodeEntity);
    const authCodeWatcher = new RedisWatcher(redis, {
        pattern: `${CachePrefix.OAUTH2_AUTHORIZATION_CODE}*`,
    });
    authCodeWatcher.on('set', (input) => {
        const keyPath = parseRedisKeyPath(input);
        useLogger().debug(`Adding new authorization-code: ${keyPath.key}`);
    });
    authCodeWatcher.on('del', async (input) => {
        const keyPath = parseRedisKeyPath(input);
        await authCodeRepository.delete(keyPath.key);

        useLogger().debug(`Removing expired authorization-code: #${keyPath.key}`);
    });

    await authCodeWatcher.start();

    // -------------------------------------------------

    const refreshTokenRepository = dataSource.getRepository(OAuth2RefreshTokenEntity);

    const refreshTokenWatcher = new RedisWatcher(redis, {
        pattern: `${CachePrefix.OAUTH2_REFRESH_TOKEN}*`,
    });
    refreshTokenWatcher.on('set', async (input) => {
        const keyPath = parseRedisKeyPath(input);
        useLogger().debug(`Adding new refresh-token: ${keyPath.key}`);
    });
    refreshTokenWatcher.on('del', async (input) => {
        const keyPath = parseRedisKeyPath(input);
        await refreshTokenRepository.delete(keyPath.key);

        useLogger().debug(`Removing expired refresh-token: #${keyPath.key}`);
    });

    await refreshTokenWatcher.start();
}
