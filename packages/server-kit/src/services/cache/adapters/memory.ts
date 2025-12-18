/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TTLCacheOptions } from '@isaacs/ttlcache';
import { TTLCache } from '@isaacs/ttlcache';
import type { CacheClearOptions, CacheSetOptions, ICache } from '../types';

export class MemoryCache implements ICache {
    protected instance : TTLCache<string, unknown>;

    constructor(options: TTLCacheOptions<string, unknown> = {}) {
        this.instance = new TTLCache<string, unknown>({
            checkAgeOnGet: true,
            ttl: Infinity,
            ...(options || {}),
        });
    }

    async has(key: string) : Promise<boolean> {
        return this.instance.has(key);
    }

    async get<T =unknown>(key: string): Promise<T | null> {
        const output = await this.instance.get(key);
        if (output) {
            return output as T;
        }

        return null;
    }

    async set(key: string, value: unknown, options: CacheSetOptions): Promise<void> {
        this.instance.set(key, value, {
            ttl: options.ttl,
        });
    }

    async drop(key: string): Promise<void> {
        this.instance.delete(key);
    }

    async dropMany(keys: string[]) : Promise<void> {
        for (let i = 0; i < keys.length; i++) {
            this.instance.delete(keys[i]);
        }
    }

    async clear(options: CacheClearOptions = {}) : Promise<void> {
        if (options.prefix) {
            const keys = this.instance.keys();
            let iterator = keys.next();
            while (!iterator.done) {
                if (typeof iterator.value !== 'string') {
                    continue;
                }

                if (iterator.value.startsWith(options.prefix)) {
                    this.instance.delete(iterator.value);
                }

                iterator = keys.next();
            }

            return;
        }

        this.instance.clear();
    }
}
