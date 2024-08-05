/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RedisClient } from '@authup/server-kit';
import { RedisJsonAdapter, escapeRedisKey } from '@authup/server-kit';
import type { QueryResultCache } from 'typeorm/cache/QueryResultCache';
import type { QueryResultCacheOptions } from 'typeorm/cache/QueryResultCacheOptions';

type DatabaseQueryResultCacheOptions = {
    prefix: string
};

type DatabaseQueryResultCacheOptionsInput = Partial<DatabaseQueryResultCacheOptions>;

export class DatabaseQueryResultCache implements QueryResultCache {
    protected client : RedisClient;

    protected clientJsonAdapter : RedisJsonAdapter;

    protected options: DatabaseQueryResultCacheOptions;

    constructor(client: RedisClient, options: DatabaseQueryResultCacheOptionsInput = {}) {
        this.client = client;
        this.clientJsonAdapter = new RedisJsonAdapter(this.client);

        this.options = {
            ...options,
            prefix: options.prefix || 'database',
        };
    }

    protected buildKey(id: string) {
        return escapeRedisKey(`${this.options.prefix}:${id}`);
    }

    async clear(): Promise<void> {
        const pipeline = this.client.pipeline();

        const keys = await this.client.keys(`${this.buildKey('')}*`);
        for (let i = 0; i < keys.length; i++) {
            pipeline.del(keys[i]);
        }

        await pipeline.exec();
    }

    async connect(): Promise<void> {
        return Promise.resolve();
    }

    async disconnect(): Promise<void> {
        return Promise.resolve();
    }

    async getFromCache(options: QueryResultCacheOptions): Promise<QueryResultCacheOptions | undefined> {
        if (options.identifier) {
            return this.clientJsonAdapter.get(this.buildKey(options.identifier));
        }

        return this.clientJsonAdapter.get(this.buildKey(encodeURIComponent(options.query)));
    }

    isExpired(savedCache: QueryResultCacheOptions): boolean {
        if (typeof savedCache.time === 'undefined') {
            return true;
        }

        return (savedCache.time + savedCache.duration) < new Date().getTime();
    }

    async remove(identifiers: string[]): Promise<void> {
        const pipeline = this.client.pipeline();

        for (let i = 0; i < identifiers.length; i++) {
            pipeline.del(this.buildKey(identifiers[i]));
        }

        await pipeline.exec();
    }

    async storeInCache(options: QueryResultCacheOptions): Promise<void> {
        if (options.identifier) {
            await this.clientJsonAdapter.set(
                this.buildKey(options.identifier),
                options,
                {
                    milliseconds: options.duration,
                },
            );

            return;
        }

        await this.clientJsonAdapter.set(
            this.buildKey(encodeURIComponent(options.query)),
            options,
            {
                milliseconds: options.duration,
            },
        );
    }

    synchronize(): Promise<void> {
        return Promise.resolve(undefined);
    }
}
