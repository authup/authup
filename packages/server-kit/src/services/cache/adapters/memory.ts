/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import TTLCache from '@isaacs/ttlcache';
import type { CacheSetOptions } from '../types';
import type { CacheAdapter } from './types';

export class MemoryCacheAdapter implements CacheAdapter {
    protected instance : TTLCache<string, any>;

    constructor() {
        this.instance = new TTLCache<string, any>({
            checkAgeOnGet: true,
            ttl: Infinity,
        });
    }

    async get(key: string): Promise<any> {
        return this.instance.get(key);
    }

    async set(key: string, value: any, options: CacheSetOptions): Promise<void> {
        this.instance.set(key, value, {
            ttl: options.ttl,
        });
    }

    async drop(key: string): Promise<void> {
        this.instance.delete(key);
    }
}
