/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isRedisClient } from '@authup/server-kit';
import { MemoryCacheDriver, TaggedCache } from '@rapiq/cache';
import { RedisCacheDriver } from '@rapiq/cache-redis';
import { Redis } from 'ioredis';
import {
    TAGGED_CACHE_CONNECT_TIMEOUT,
    TAGGED_CACHE_PREFIX,
    TAGGED_CACHE_REDIS_OPTIONS,
    TAGGED_CACHE_TTL,
} from './constants.ts';
import type {
    TaggedCacheClient,
    TaggedCacheClientCreateInput,
    TaggedCacheCreateInput,
    TaggedCacheCreateResult,
} from './types.ts';

// a URL may name a keyPrefix too, and it wins over any second argument, so the source client is read.
function createSourceClient(input: TaggedCacheClientCreateInput) : Redis {
    if (isRedisClient(input)) {
        return input;
    }

    if (input === true) {
        return new Redis('redis://127.0.0.1', { lazyConnect: true });
    }

    if (typeof input === 'string') {
        return new Redis(input, { lazyConnect: true });
    }

    return new Redis({ ...input, lazyConnect: true });
}

/**
 * The driver prefix: the source client's `keyPrefix`, which the driver
 * client may not carry itself, followed by `authup`.
 */
export function resolveTaggedCachePrefix(source: Redis) : string {
    const { keyPrefix } = source.options;

    if (typeof keyPrefix === 'string' && keyPrefix.length > 0) {
        return `${keyPrefix}${TAGGED_CACHE_PREFIX}`;
    }

    return TAGGED_CACHE_PREFIX;
}

/**
 * The client the driver gets, without a `keyPrefix` (the driver refuses one,
 * its scripts never see it), and the driver prefix taken from the same source.
 */
export function createTaggedCacheClient(input: TaggedCacheClientCreateInput) : TaggedCacheClient {
    const source = createSourceClient(input);
    const prefix = resolveTaggedCachePrefix(source);
    // the driver's ready() opens the connection.
    const client = source.duplicate({
        ...TAGGED_CACHE_REDIS_OPTIONS,
        keyPrefix: undefined,
        lazyConnect: true,
    });

    if (source !== input) {
        source.disconnect();
    }

    return { client, prefix };
}

export function createTaggedCache(input: TaggedCacheCreateInput) : TaggedCacheCreateResult {
    if (!input.redis) {
        return {
            cache: new TaggedCache({
                driver: new MemoryCacheDriver({ maxTtl: TAGGED_CACHE_TTL }),
                ttl: TAGGED_CACHE_TTL,
                onError: input.onError,
            }),
            ready: async () => {},
            dispose: async () => {},
        };
    }

    const { client, prefix } = createTaggedCacheClient(input.redis);

    client.on('error', (error) => input.onError(error));

    const driver = new RedisCacheDriver({
        client,
        prefix,
        maxTtl: TAGGED_CACHE_TTL,
    });

    return {
        cache: new TaggedCache({
            driver,
            ttl: TAGGED_CACHE_TTL,
            onError: input.onError,
        }),
        ready: async () => {
            await driver.ready(TAGGED_CACHE_CONNECT_TIMEOUT);
        },
        dispose: async () => {
            client.disconnect();
        },
    };
}
