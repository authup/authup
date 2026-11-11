/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ITaggedCache } from '@rapiq/cache';
import { collectQueryTags, isCacheable } from '@rapiq/cache';
import type { DataSource } from 'typeorm';
import { cacheSchemaRegistry } from './registry.ts';
import type {
    IQueryCache,
    QueryCacheContext,
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
        if (!this.cache || this.isTransactionActive(options)) {
            return read();
        }

        return this.cache.remember(key, read, { tags });
    }

    async rememberQuery<T>(
        input: QueryCacheQueryInput<T>,
        read: () => Promise<T>,
        options: QueryCacheReadOptions = {},
    ): Promise<T> {
        if (!isCacheable(input.query)) {
            return read();
        }

        return this.remember(
            input.key,
            (value) => {
                const tags = collectQueryTags({
                    query: input.query,
                    schema: input.schema,
                    registry: cacheSchemaRegistry,
                    value,
                    rows: input.rows,
                    caseSensitive: input.caseSensitive,
                });

                if (!input.tags) {
                    return tags;
                }

                return [...new Set([...tags, ...input.tags(value)])];
            },
            read,
            options,
        );
    }

    /**
     * A read inside an open transaction can see its uncommitted writes,
     * which a rollback never bumps away (#3688).
     */
    protected isTransactionActive(options: QueryCacheReadOptions): boolean {
        const manager = options.manager ?? this.dataSource.manager;

        if (manager.queryRunner?.isTransactionActive) {
            return true;
        }

        // better-sqlite3 hands back its one shared runner, which must not be released.
        if (this.dataSource.options.type === 'better-sqlite3') {
            return this.dataSource.createQueryRunner().isTransactionActive;
        }

        return false;
    }
}
