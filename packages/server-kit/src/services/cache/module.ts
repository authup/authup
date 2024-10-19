/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { CacheAdapter } from './adapters';
import type { CacheSetOptions } from './types';

export class Cache {
    protected adapter : CacheAdapter;

    constructor(adapter: CacheAdapter) {
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
}
