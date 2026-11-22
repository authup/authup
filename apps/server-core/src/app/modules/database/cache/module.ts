/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ITaggedCache } from '@rapiq/cache';
import { rememberQuery } from '@rapiq/cache';
import { isTransactionActive } from '@rapiq/cache/typeorm';
import type { DataSource } from 'typeorm';
import { schemaRegistry } from '../../../../core/index.ts';
import { QUERY_CACHE_SCOPED_VALUE_NORMALIZER } from './constants.ts';
import type {
    IQueryCache,
    QueryCacheContext,
    QueryCacheInvalidator,
    QueryCacheQueryInput,
    QueryCacheReadOptions,
} from './types.ts';

export class QueryCache implements IQueryCache {
    protected dataSource: DataSource;

    protected cache: ITaggedCache | undefined;

    constructor(ctx: QueryCacheContext) {
        this.dataSource = ctx.dataSource;
        this.cache = ctx.cache;
    }

    async remember<T>(
        key: string,
        tags: (value: T) => string[],
        read: () => Promise<T>,
        options: QueryCacheReadOptions = {},
    ): Promise<T> {
        if (!this.cache || this.isBypassed(options)) {
            return read();
        }

        return this.cache.remember(key, read, { tags });
    }

    async rememberQuery<T>(
        input: QueryCacheQueryInput<T>,
        read: () => Promise<T>,
        options: QueryCacheReadOptions = {},
    ): Promise<T> {
        if (!this.cache || this.isBypassed(options)) {
            return read();
        }

        return rememberQuery(this.cache, {
            ...input,
            registry: schemaRegistry,
            normalizeScopedValue: QUERY_CACHE_SCOPED_VALUE_NORMALIZER,
        }, read);
    }

    /**
     * What the invalidation subscriber bumps through. A rejected bump
     * stays pending in the tagged cache, which neither serves nor stores
     * a value carrying a pending tag and replays the bump.
     */
    createInvalidator(): QueryCacheInvalidator {
        return {
            invalidate: async (tags: string[]) => {
                if (!this.cache) {
                    return;
                }

                await this.cache.invalidate(tags);
            },
        };
    }

    protected isBypassed(options: QueryCacheReadOptions): boolean {
        return this.isTransactionActive(options);
    }

    /**
     * A read inside an open transaction can see its uncommitted writes,
     * which a rollback never bumps away (#3688).
     */
    protected isTransactionActive(options: QueryCacheReadOptions): boolean {
        return isTransactionActive(this.dataSource, options.manager);
    }
}
