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

const RENEW_IF_VALUE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('pexpire', KEYS[1], ARGV[2])
end
return 0
`;

const DROP_IF_VALUE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
    return redis.call('del', KEYS[1])
end
return 0
`;

export class RedisCache implements ICache {
    protected client : Client;

    protected jsonAdapter : JsonAdapter;

    constructor(input: string | boolean | RedisClient | RedisClientOptions) {
        this.client = createRedisClient(input);
        this.jsonAdapter = new JsonAdapter(this.client);
    }

    async get(key: string): Promise<any> {
        // jsonAdapter.get returns undefined for an absent key — distinguish that
        // from a stored falsy value (`0` counter, `false`, `''`) which must
        // round-trip instead of reading back as null.
        const output = await this.jsonAdapter.get(key);
        if (typeof output === 'undefined') {
            return null;
        }

        return output;
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
        // EXISTS, not a truthiness check on the value — a stored falsy value
        // (`0`/`false`/`''`) is still present.
        return (await this.client.exists(key)) > 0;
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

    async renewIfValue(key: string, value: string, ttl: number): Promise<boolean> {
        const result = await this.client.eval(
            RENEW_IF_VALUE_SCRIPT,
            1,
            key,
            JSON.stringify(value),
            ttl,
        );

        return result === 1;
    }

    async dropIfValue(key: string, value: string): Promise<boolean> {
        const result = await this.client.eval(
            DROP_IF_VALUE_SCRIPT,
            1,
            key,
            JSON.stringify(value),
        );

        return result === 1;
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
