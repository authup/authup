/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Cache as RedisCache,
    Client as RedisClient,
    ClientOptions as RedisClientOptions,
    KeyPathID as RedisKeyPathID,
    createClient as createRedisClient,
} from 'redis-extension';

export {
    createRedisClient,
    RedisClient,
    RedisClientOptions,
    RedisKeyPathID,
    RedisCache,
};
