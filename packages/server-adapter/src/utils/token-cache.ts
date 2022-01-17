/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Redis, RedisCache, useRedisInstance } from 'redis-extension';

export function initTokenCache(
    redis: Redis | boolean,
    redisPrefix?: string,
) : RedisCache<string> | undefined {
    let tokenCache : RedisCache<string> | undefined;

    if (redis) {
        redis = typeof redis === 'boolean' ?
            useRedisInstance('default') :
            redis;

        tokenCache = new RedisCache<string>({
            redis,
        }, {
            prefix: redisPrefix || 'token',
        });

        tokenCache.startScheduler();
    }

    return tokenCache;
}
