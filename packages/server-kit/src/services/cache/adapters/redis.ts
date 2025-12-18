/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from 'redis-extension';
import { JsonAdapter } from 'redis-extension';
import type { RedisClient, RedisClientOptions } from '../../redis';
import { createRedisClient } from '../../redis';
import type { CacheClearOptions, CacheSetOptions, ICache } from '../types';

export class RedisCache implements ICache {
    protected client : Client;

    protected jsonAdapter : JsonAdapter;

    constructor(input: string | boolean | RedisClient | RedisClientOptions) {
        this.client = createRedisClient(input);
        this.jsonAdapter = new JsonAdapter(this.client);
    }

    async get(key: string): Promise<any> {
        const output = await this.jsonAdapter.get(key);
        if (output) {
            return output;
        }

        return null;
    }

    async has(key: string) : Promise<boolean> {
        const output = await this.get(key);

        return !!output;
    }

    async set(key: string, value: any, options: CacheSetOptions): Promise<void> {
        await this.jsonAdapter.set(key, value, {
            milliseconds: options.ttl,
        });
    }

    async drop(key: string): Promise<void> {
        await this.jsonAdapter.drop(key);
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
