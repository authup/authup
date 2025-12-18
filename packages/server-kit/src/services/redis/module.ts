/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Client as RedisClient,
    JsonAdapter as RedisJsonAdapter,
    Watcher as RedisWatcher,
    buildKeyPath as buildRedisKeyPath,

    escapeKey as escapeRedisKey,
    parseKeyPath as parseRedisKeyPath,
} from 'redis-extension';

import type {
    ClientOptions as RedisClientOptions,
} from 'redis-extension';

export type {
    RedisClientOptions,
};

export {
    RedisClient,
    RedisJsonAdapter,
    RedisWatcher,

    escapeRedisKey,
    buildRedisKeyPath,
    parseRedisKeyPath,
};
