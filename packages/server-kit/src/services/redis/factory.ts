/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createClient } from 'redis-extension';
import { isRedisClient } from './check';
import type { RedisClient, RedisClientOptions } from './module';

export type RedisClientCreateInput = string | boolean | RedisClient | RedisClientOptions;

export function createRedisClient(input: RedisClientCreateInput) {
    if (typeof input === 'boolean') {
        return createClient({
            connectionString: 'redis://127.0.0.1',
        });
    }

    if (typeof input === 'string') {
        return createClient({
            connectionString: input,
        });
    }

    if (!isRedisClient(input)) {
        return createClient({
            options: input,
        });
    }

    return input;
}
