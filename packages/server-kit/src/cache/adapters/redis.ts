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

    async pop<T = unknown>(key: string): Promise<T | null> {
        const raw = await this.client.getdel(key);
        if (!raw) {
            return null;
        }

        try {
            return JSON.parse(raw) as T;
        } catch {
            return null;
        }
    }

    async has(key: string) : Promise<boolean> {
        const output = await this.get(key);

        return !!output;
    }

    async set(key: string, value: any, options: CacheSetOptions): Promise<void> {
        await this.jsonAdapter.set(key, value, { milliseconds: options.ttl });
    }

    async add(key: string, value: any, options: CacheSetOptions = {}): Promise<boolean> {
        // Atomic set-if-absent via `SET key value [PX ttl] NX` — returns 'OK'
        // when stored, null when the key already existed.
        const payload = JSON.stringify(value);
        const result = options.ttl ?
            await this.client.set(key, payload, 'PX', options.ttl, 'NX') :
            await this.client.set(key, payload, 'NX');

        return result === 'OK';
    }

    async increment(key: string, value = 1, options: CacheSetOptions = {}): Promise<number> {
        // INCRBY is atomic; the follow-up PEXPIRE only (re)arms the expiry,
        // so an interleaved concurrent increment is harmless. Rejects when
        // the key holds a non-integer value.
        const output = await this.client.incrby(key, value);
        if (options.ttl) {
            await this.client.pexpire(key, options.ttl);
        }

        return output;
    }

    async drop(key: string): Promise<void> {
        await this.jsonAdapter.drop(key);
    }

    async dropMany(keys: string[]) : Promise<void> {
        const pipeline = this.client.pipeline();

        for (const key of keys) {
            pipeline.del(key);
        }

        await pipeline.exec();
    }

    async clear(options: CacheClearOptions = {}) : Promise<void> {
        if (options.prefix) {
            const pipeline = this.client.pipeline();

            const keys = await this.client.keys(`${options.prefix}*`);
            for (const key of keys) {
                pipeline.del(key);
            }

            await pipeline.exec();

            return;
        }
        await this.client.flushdb();
    }
}
