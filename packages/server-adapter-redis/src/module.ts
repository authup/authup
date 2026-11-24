/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client, ClientOptions } from 'redis-extension';
import { ValueStore, createClient } from 'redis-extension';
import type { ITokenCache, TokenCacheEntry } from '@authup/server-adapter-kit';

/**
 * A cache outage must fall through to verification fast, never queue or
 * hang: one retry, no offline queue, a 500 ms command timeout.
 */
export const REDIS_TOKEN_CACHE_CLIENT_OPTIONS = {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    commandTimeout: 500,
    // ioredis relaxes the command timeout to this value during a Redis
    // maintenance window (default 10 s), which a fall-through cache must not wait for.
    maintRelaxedCommandTimeout: 500,
    retryStrategy: (times: number) => Math.min(times * 50, 2_000),
} satisfies ClientOptions;

/**
 * vouchly's token cache on redis. The key vouchly hands over is already a
 * SHA-256 of the namespace and the token, so it is stored as is.
 */
export class RedisTokenCache implements ITokenCache {
    protected instance : ValueStore<TokenCacheEntry>;

    constructor(input?: Client | string) {
        let client: Client;

        if (!input) {
            client = createClient({ options: REDIS_TOKEN_CACHE_CLIENT_OPTIONS });
        } else if (typeof input === 'string') {
            client = createClient({ url: input, options: REDIS_TOKEN_CACHE_CLIENT_OPTIONS });
        } else {
            client = input;
        }

        this.instance = new ValueStore<TokenCacheEntry>(client);
    }

    async get(key: string): Promise<TokenCacheEntry | undefined> {
        try {
            return await this.instance.get(this.buildKey(key));
        } catch {
            // an unreachable redis or a key of another type reads as a miss.
            return undefined;
        }
    }

    async set(key: string, entry: TokenCacheEntry, ttl: number): Promise<void> {
        if (!(ttl > 0)) {
            return;
        }

        // vouchly refuses an expired hit itself, so rounding up is safe.
        await this.instance.set(this.buildKey(key), entry, { seconds: Math.ceil(ttl) });
    }

    protected buildKey(key: string) {
        return `vouchly:${key}`;
    }
}
