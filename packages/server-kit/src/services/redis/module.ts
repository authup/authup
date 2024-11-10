/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Client as RedisClient,
    ClientOptions as RedisClientOptions,
    JsonAdapter as RedisJsonAdapter,
    Watcher as RedisWatcher,
    buildKeyPath as buildRedisKeyPath,

    createClient as createRedisClient,
    escapeKey as escapeRedisKey,
    parseKeyPath as parseRedisKeyPath,
} from 'redis-extension';

export {
    createRedisClient,
    RedisClient,
    RedisClientOptions,
    RedisJsonAdapter,
    RedisWatcher,

    escapeRedisKey,
    buildRedisKeyPath,
    parseRedisKeyPath,
};
