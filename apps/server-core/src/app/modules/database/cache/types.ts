/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ITaggedCache } from '@rapiq/cache';
import type { IQuery } from '@rapiq/core';
import type { DataSource, EntityManager } from 'typeorm';

export type QueryCacheReadOptions = {
    /** The manager the read runs through. Default: the DataSource's own. */
    manager?: EntityManager,
};

export type QueryCacheQueryInput<T> = {
    key: string,
    query: IQuery,
    schema: string,
    caseSensitive?: string[],
    rows?: (value: T) => unknown,
    /** Tags beyond what the query derivation yields. */
    tags?: (value: T) => string[],
};

export interface IQueryCache {
    remember<T>(
        key: string,
        tags: (value: T) => string[],
        read: () => Promise<T>,
        options?: QueryCacheReadOptions,
    ): Promise<T>;

    rememberQuery<T>(
        input: QueryCacheQueryInput<T>,
        read: () => Promise<T>,
        options?: QueryCacheReadOptions,
    ): Promise<T>;
}

export type QueryCacheContext = {
    dataSource: DataSource,
    cache?: ITaggedCache,
    /** The clock the suspension window is measured on. Default: `Date.now()`. */
    now?: () => number,
};

/**
 * What the invalidation subscriber bumps through.
 */
export type QueryCacheInvalidator = Pick<ITaggedCache, 'invalidate'>;
