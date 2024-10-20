/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import { JsonAdapter } from 'redis-extension';
import { useRedisClient } from '../../redis';
import type { CacheClearOptions, CacheSetOptions } from '../types';
import type { CacheAdapter } from './types';

export class RedisCacheAdapter implements CacheAdapter {
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

    async dropMany(keys: string[]) : Promise<void> {
        const pipeline = this.client.pipeline();

        for (let i = 0; i < keys.length; i++) {
            pipeline.del(keys[i]);
        }

        await pipeline.exec();
    }

    async clear(options: CacheClearOptions = {}) : Promise<void> {
        if (options.prefix) {
            const pipeline = this.client.pipeline();

            const keys = await this.client.keys(`${options.prefix}*`);
            for (let i = 0; i < keys.length; i++) {
                pipeline.del(keys[i]);
            }

            await pipeline.exec();

            return;
        }
        await this.client.flushdb();
    }
}
