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

    async pop<T = unknown>(key: string): Promise<T | null> {
        if (this.instance.has(key)) {
            const output = this.instance.get(key);
            this.instance.delete(key);
            return output as T;
        }

        return null;
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
        this.instance.set(key, value, { ttl: options.ttl });
    }

    async add(key: string, value: unknown, options: CacheSetOptions = {}): Promise<boolean> {
        // The check + set run in a single synchronous tick (no await between),
        // so this is atomic within the single-threaded process.
        if (this.instance.has(key)) {
            return false;
        }

        this.instance.set(key, value, { ttl: options.ttl });
        return true;
    }

    async increment(key: string, value = 1, options: CacheSetOptions = {}): Promise<number> {
        // The read + write run in a single synchronous tick (no await
        // between), so this is atomic within the single-threaded process.
        const current = this.instance.get(key);
        if (typeof current !== 'undefined' && typeof current !== 'number') {
            throw new Error(`The value at key ${key} is not a number.`);
        }

        const output = (current ?? 0) + value;
        this.instance.set(key, output, { ttl: options.ttl });
        return output;
    }

    async drop(key: string): Promise<void> {
        this.instance.delete(key);
    }

    async dropMany(keys: string[]) : Promise<void> {
        for (const key of keys) {
            this.instance.delete(key);
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
