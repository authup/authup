/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RedisOptions } from 'ioredis';

export const TAGGED_CACHE_PREFIX = 'authup';

/**
 * How long an entry lives, and how long reads bypass the cache after a
 * lost invalidation (#3688).
 */
export const TAGGED_CACHE_TTL = 60_000;

export const TAGGED_CACHE_ERROR_LOG_INTERVAL = 10_000;

export const TAGGED_CACHE_CONNECT_TIMEOUT = 1_000;

// a cache outage must fall through to the database fast, never queue or hang.
export const TAGGED_CACHE_REDIS_OPTIONS = {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    commandTimeout: 500,
} satisfies RedisOptions;
