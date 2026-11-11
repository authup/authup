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
import { TAGGED_CACHE_CONNECT_TIMEOUT, TAGGED_CACHE_PREFIX, TAGGED_CACHE_REDIS_OPTIONS } from './constants.ts';
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
    const client = source.duplicate({
        ...TAGGED_CACHE_REDIS_OPTIONS,
        keyPrefix: undefined,
        lazyConnect: false,
    });

    if (source !== input) {
        source.disconnect();
    }

    return { client, prefix };
}

// without an offline queue, a command sent before the connection is up fails.
function waitForClient(client: Redis) : Promise<void> {
    if (client.status === 'ready' || client.status === 'wait') {
        return Promise.resolve();
    }

    return new Promise((resolve) => {
        const done = () => {
            clearTimeout(timeout);
            client.off('ready', done);
            client.off('error', done);
            client.off('end', done);
            resolve();
        };
        const timeout = setTimeout(done, TAGGED_CACHE_CONNECT_TIMEOUT);

        client.once('ready', done);
        client.once('error', done);
        client.once('end', done);
    });
}

export function createTaggedCache(input: TaggedCacheCreateInput) : TaggedCacheCreateResult {
    if (!input.redis) {
        return {
            cache: new TaggedCache({ driver: new MemoryCacheDriver(), onError: input.onError }),
            ready: async () => {},
            dispose: async () => {},
        };
    }

    const { client, prefix } = createTaggedCacheClient(input.redis);

    client.on('error', (error) => input.onError(error));

    return {
        cache: new TaggedCache({
            driver: new RedisCacheDriver({ client, prefix }),
            onError: input.onError,
        }),
        ready: () => waitForClient(client),
        dispose: async () => {
            client.disconnect();
        },
    };
}
