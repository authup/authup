/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { QueryBuildInput, SchemaDescription } from '@rapiq/core';
import type { SchemaResponseMeta } from '../workflows/schema/types';

export type StatsBucketUnit = 'hour' | 'day' | 'month';

/**
 * A statistics read in rapiq's own vocabulary: the rows to count
 * (`filters`, which must carry a lower bound on the date column), the
 * grouping (`groups`, first a `bucket(<dateColumn>, <unit>)`) and the
 * measures (`aggregates`, `count` only).
 */
export type EntityStatsQuery<T extends ObjectLiteral = ObjectLiteral> = Pick<
    QueryBuildInput<T>,
'filters' | 'groups' | 'aggregates'
>;

/**
 * One grouped row, keyed by column: the bucket start under the date column,
 * the values of the other groups, and the count.
 */
export type EntityStatsRow<G extends Record<string, any> = Record<string, unknown>> = G & {
    /**
     * The bucket start, an ISO instant in UTC.
     */
    createdAt: string,
    count: number,
};

export type EntityStatsMeta = {
    /**
     * The window start: the lower bound, snapped onto a bucket start.
     */
    from: string,
    /**
     * The window end: the upper bound, else the instant of the read.
     */
    to: string,
    bucket: StatsBucketUnit,
    /**
     * Rows the filter admits without its top-level window conditions.
     */
    total: number,
    /**
     * The vocabulary this read decodes.
     */
    schema: SchemaDescription,
};

/**
 * Deliberately not the entity envelope: a row is not an entity. Absent
 * buckets hold no rows; a consumer zero-fills between `from` and `to`.
 */
export type EntityStatsResponse<
    G extends Record<string, any> = Record<string, unknown>,
    M extends Record<string, any> = Record<string, unknown>,
> = {
    data: EntityStatsRow<G>[],
    meta: EntityStatsMeta & M,
};

/**
 * The entity's queryable vocabulary; `meta` is the bulk read's
 * (`version`, the registry `hash`, `recordParameters`).
 */
export type EntitySchemaResponse = {
    data: SchemaDescription,
    meta: SchemaResponseMeta,
};

/**
 * The statistics facet of an entity API (`GET /<entity>/@stats`).
 */
export interface IEntityStatsAPI<
    T extends ObjectLiteral,
    G extends Record<string, any> = Record<string, unknown>,
    M extends Record<string, any> = Record<string, unknown>,
> {
    getStats(query?: EntityStatsQuery<T>): Promise<EntityStatsResponse<G, M>>;
}

/**
 * The schema facet of an entity API (`GET /<entity>/@schema`).
 */
export interface IEntitySchemaAPI {
    getSchema(): Promise<EntitySchemaResponse>;
}
