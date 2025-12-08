/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Cache } from '@authup/server-kit';
import { escapeRedisKey, useCache } from '@authup/server-kit';
import type { QueryResultCache } from 'typeorm/cache/QueryResultCache.js';
import type { QueryResultCacheOptions } from 'typeorm/cache/QueryResultCacheOptions.js';

export class DatabaseQueryResultCache implements QueryResultCache {
    protected instance : Cache;

    constructor() {
        this.instance = useCache();
    }

    protected buildKey(id: string) {
        return escapeRedisKey(`db:${id}`);
    }

    async clear(): Promise<void> {
        await this.instance.clear({
            prefix: this.buildKey(''),
        });
    }

    async connect(): Promise<void> {
        return Promise.resolve();
    }

    async disconnect(): Promise<void> {
        return Promise.resolve();
    }

    async getFromCache(options: QueryResultCacheOptions): Promise<QueryResultCacheOptions | undefined> {
        if (options.identifier) {
            return this.instance.get(this.buildKey(options.identifier));
        }

        if (typeof options.query !== 'undefined') {
            return this.instance.get(this.buildKey(encodeURIComponent(options.query)));
        }

        return undefined;
    }

    isExpired(savedCache: QueryResultCacheOptions): boolean {
        if (typeof savedCache.time === 'undefined') {
            return true;
        }

        return (savedCache.time + savedCache.duration) < new Date().getTime();
    }

    async remove(identifiers: string[]): Promise<void> {
        const keys = identifiers.map((identifier) => this.buildKey(identifier));
        await this.instance.dropMany(keys);
    }

    async storeInCache(options: QueryResultCacheOptions): Promise<void> {
        if (options.identifier) {
            await this.instance.set(
                this.buildKey(options.identifier),
                options,
                {
                    ttl: options.duration,
                },
            );

            return;
        }

        if (typeof options.query !== 'undefined') {
            await this.instance.set(
                this.buildKey(encodeURIComponent(options.query)),
                options,
                {
                    ttl: options.duration,
                },
            );
        }
    }

    synchronize(): Promise<void> {
        return Promise.resolve(undefined);
    }
}
