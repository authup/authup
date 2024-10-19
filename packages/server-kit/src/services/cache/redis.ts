/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import { JsonAdapter } from 'redis-extension';
import { useRedisClient } from '../redis';
import type { Cache, CacheSetOptions } from './types';

export class RedisCache implements Cache {
    protected client : Client;

    protected instance : JsonAdapter;

    constructor() {
        this.client = useRedisClient();
        this.instance = new JsonAdapter(this.client);
    }

    async get(key: string): Promise<any> {
        return this.instance.get(key);
    }

    async set(key: string, value: any, options: CacheSetOptions): Promise<void> {
        await this.instance.set(key, value, {
            milliseconds: options.ttl,
        });
    }

    async drop(key: string): Promise<void> {
        await this.instance.drop(key);
    }
}
