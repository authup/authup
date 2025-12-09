/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICacheAdapter } from './adapters';
import type { CacheClearOptions, CacheSetOptions } from './types';

export class Cache {
    protected adapter : ICacheAdapter;

    constructor(adapter: ICacheAdapter) {
        this.adapter = adapter;
    }

    async set(key: string, value: any, options: CacheSetOptions = {}) : Promise<void> {
        await this.adapter.set(key, value, options);
    }

    async get(key: string) : Promise<any | undefined> {
        return this.adapter.get(key);
    }

    async drop(key: string) : Promise<void> {
        return this.adapter.drop(key);
    }

    async dropMany(keys: string[]) : Promise<void> {
        return this.adapter.dropMany(keys);
    }

    async clear(options: CacheClearOptions = {}) : Promise<void> {
        return this.adapter.clear(options);
    }
}
