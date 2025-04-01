/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Options } from '@isaacs/ttlcache';
import TTLCache from '@isaacs/ttlcache';
import type { CacheClearOptions, CacheSetOptions } from '../types';
import type { CacheAdapter } from './types';

export class MemoryCacheAdapter<
    VALUE = any,
> implements CacheAdapter {
    protected instance : TTLCache<string, VALUE>;

    constructor(options: Options<string, VALUE> = {}) {
        this.instance = new TTLCache<string, VALUE>({
            checkAgeOnGet: true,
            ttl: Infinity,
            ...(options || {}),
        });
    }

    async has(key: string) : Promise<boolean> {
        return this.instance.has(key);
    }

    async get(key: string): Promise<VALUE> {
        return this.instance.get(key);
    }

    async set(key: string, value: VALUE, options: CacheSetOptions): Promise<void> {
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
