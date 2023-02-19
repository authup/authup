/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import { Cache, useClient } from 'redis-extension';

let instance : Cache<string> | undefined;

export function useOAuth2TokenCache(
    redis: Client | boolean,
    redisPrefix?: string,
) : Cache<string> | undefined {
    if (typeof instance !== 'undefined' || !redis) {
        return instance;
    }

    if (redis) {
        redis = typeof redis === 'boolean' ?
            useClient('default') :
            redis;

        instance = new Cache<string>({
            redis,
        }, {
            prefix: redisPrefix || 'token',
        });
    }

    return instance;
}
