/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICache } from '@authup/server-kit';
import { escapeRedisKey } from '@authup/server-kit';
import type { QueryResultCache } from 'typeorm/cache/QueryResultCache.js';
import type { QueryResultCacheOptions } from 'typeorm/cache/QueryResultCacheOptions.js';
import type { DatabaseQueryResultCacheOptions, FencedQueryResultCacheOptions } from './types.ts';

/**
 * A fenced identifier is served only while its generation key still holds
 * the generation the value was tagged with. The generation is read (or
 * created) by the lookup, before typeorm runs the SELECT, and handed back to
 * the store as the saved entry; `remove` drops it with the value. So a fill
 * whose SELECT saw a row from before a commit and whose store lands after the
 * subscriber's drops is never served: dropping only the value key lets it
 * overwrite the fresher state.
 */
export class DatabaseQueryResultCache implements QueryResultCache {
    protected instance : ICache;

    protected fenced : (identifier: string) => boolean;

    constructor(cache: ICache, options: DatabaseQueryResultCacheOptions = {}) {
        this.instance = cache;
        this.fenced = options.fenced ?? (() => false);
    }

    protected buildKey(id: string) {
        return escapeRedisKey(`db:${id}`);
    }

    protected buildGenerationKey(id: string) {
        return escapeRedisKey(`db:generation:${id}`);
    }

    async clear(): Promise<void> {
        await this.instance.clear({ prefix: this.buildKey('') });
    }

    async connect(): Promise<void> {
        return Promise.resolve();
    }

    async disconnect(): Promise<void> {
        return Promise.resolve();
    }

    async getFromCache(options: QueryResultCacheOptions): Promise<QueryResultCacheOptions | undefined> {
        if (options.identifier && this.fenced(options.identifier)) {
            return this.getFromFencedCache(options.identifier, options);
        }

        let output : QueryResultCacheOptions | undefined | null;

        if (options.identifier) {
            output = await this.instance.get(this.buildKey(options.identifier));
        } else if (typeof options.query !== 'undefined') {
            output = await this.instance.get(this.buildKey(encodeURIComponent(options.query)));
        }

        if (output) {
            return output;
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

        for (const identifier of identifiers) {
            if (this.fenced(identifier)) {
                keys.push(this.buildGenerationKey(identifier));
            }
        }

        await this.instance.dropMany(keys);
    }

    async storeInCache(
        options: QueryResultCacheOptions,
        savedCache?: FencedQueryResultCacheOptions,
    ): Promise<void> {
        if (options.identifier && this.fenced(options.identifier)) {
            if (!savedCache?.generation) {
                return;
            }

            await this.instance.set(
                this.buildKey(options.identifier),
                { ...options, generation: savedCache.generation } satisfies FencedQueryResultCacheOptions,
                { ttl: options.duration },
            );

            return;
        }

        if (options.identifier) {
            await this.instance.set(
                this.buildKey(options.identifier),
                options,
                { ttl: options.duration },
            );

            return;
        }

        if (typeof options.query !== 'undefined') {
            await this.instance.set(
                this.buildKey(encodeURIComponent(options.query)),
                options,
                { ttl: options.duration },
            );
        }
    }

    /**
     * A miss answers an expired entry carrying the generation, which typeorm
     * hands back to `storeInCache` once the SELECT returned. A miss without
     * a generation (it was dropped while being created) stores nothing.
     */
    protected async getFromFencedCache(
        identifier: string,
        options: QueryResultCacheOptions,
    ): Promise<FencedQueryResultCacheOptions | undefined> {
        const generationKey = this.buildGenerationKey(identifier);

        const [saved, current] = await Promise.all([
            this.instance.get<FencedQueryResultCacheOptions>(this.buildKey(identifier)),
            this.instance.get<string>(generationKey),
        ]);

        if (saved && current && saved.generation === current) {
            return saved;
        }

        let generation : string | null | undefined = current;

        if (!generation) {
            generation = crypto.randomUUID();

            const added = await this.instance.add(generationKey, generation, { ttl: options.duration });

            if (!added) {
                generation = await this.instance.get<string>(generationKey);
            }
        }

        if (!generation) {
            return undefined;
        }

        return {
            identifier,
            query: options.query,
            duration: options.duration,
            generation,
        };
    }

    synchronize(): Promise<void> {
        return Promise.resolve(undefined);
    }
}
