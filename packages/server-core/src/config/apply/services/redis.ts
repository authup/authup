/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { RedisClient, RedisClientOptions } from '@authup/server-kit';
import { createRedisClient, setRedisClient, setRedisFactory } from '@authup/server-kit';

export function isRedisClient(data: unknown) : data is RedisClient {
    return isObject(data) &&
        typeof data.connect === 'function' &&
        typeof data.disconnect === 'function';
}

export function applyConfigRedis(data: string | boolean | RedisClient | RedisClientOptions): void {
    if (typeof data === 'boolean' || !data) {
        if (data) {
            setRedisFactory(() => createRedisClient({
                connectionString: 'redis://127.0.0.1',
            }));
        }

        return;
    }

    if (typeof data === 'string') {
        setRedisFactory(() => createRedisClient({
            connectionString: data,
        }));

        return;
    }

    if (!isRedisClient(data)) {
        setRedisFactory(() => createRedisClient({
            options: data,
        }));

        return;
    }

    setRedisClient(data);
}
