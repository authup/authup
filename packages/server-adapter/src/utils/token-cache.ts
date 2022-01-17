/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Cache, Client, useClient } from 'redis-extension';

export function initTokenCache(
    redis: Client | boolean,
    redisPrefix?: string,
) : Cache<string> | undefined {
    let tokenCache : Cache<string> | undefined;

    if (redis) {
        redis = typeof redis === 'boolean' ?
            useClient('default') :
            redis;

        tokenCache = new Cache<string>({
            redis,
        }, {
            prefix: redisPrefix || 'token',
        });

        tokenCache.startScheduler();
    }

    return tokenCache;
}
