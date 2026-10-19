/*
 * Copyright (c) 2023-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import { JsonAdapter, createClient } from 'redis-extension';
import type { ITokenCache, TokenCacheEntry } from 'vouchly';

/**
 * vouchly's token cache on redis. The key vouchly hands over is already a
 * SHA-256 of the namespace and the token, so it is stored as is.
 */
export class RedisTokenCache implements ITokenCache {
    protected instance : JsonAdapter;

    constructor(input?: Client | string) {
        let client: Client;

        if (!input) {
            client = createClient();
        } else if (typeof input === 'string') {
            client = createClient({ connectionString: input });
        } else {
            client = input;
        }

        this.instance = new JsonAdapter(client);
    }

    get(key: string): Promise<TokenCacheEntry | undefined> {
        return this.instance.get(this.buildKey(key));
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
