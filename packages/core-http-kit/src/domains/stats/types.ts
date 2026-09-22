/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ObjectLiteral } from '@authup/kit';
import type { QueryBuildInput, SchemaDescription } from '@rapiq/core';
import type { SchemaResponseMeta } from '../workflows/schema/types';
import type { StatsGranularity } from './constants';

export type EntityStatsQuery<T extends ObjectLiteral = ObjectLiteral> = {
    /**
     * The rows to count, in the entity schema's filter vocabulary (the same
     * `filter[...]` its collection read takes; a realm switcher's scope is
     * `{ realmId: [<id>, null] }`). The window is NOT a filter: see `days`.
     */
    filters?: QueryBuildInput<T>['filters'],
    /**
     * The bucket width. Defaults to `day`.
     */
    granularity?: `${StatsGranularity}`,
    /**
     * The window, in whole days back from now. Defaults to 30. The window
     * times the buckets per day must not exceed the server's bucket ceiling.
     */
    days?: number,
};

/**
 * One grouped count: the rows created inside one bucket, plus the values of
 * the entity's group keys (events: `scope` and `name`; most entities: none).
 */
export type EntityStatsBucket<G extends Record<string, any> = Record<string, unknown>> = G & {
    /**
     * The bucket start, an ISO instant in UTC.
     */
    bucket: string,
    count: number,
};

export type EntityStatsMeta = {
    /**
     * The window start, snapped onto a bucket boundary.
     */
    from: string,
    /**
     * The window end, the instant the counts were taken.
     */
    to: string,
    granularity: `${StatsGranularity}`,
    days: number,
    /**
     * Every row the filter and the caller's read reach admit, regardless of
     * the window.
     */
    total: number,
    /**
     * The filter vocabulary this read decodes.
     */
    schema: SchemaDescription,
};

/**
 * Deliberately not the entity envelope: a bucket is not an entity. Absent
 * buckets hold no rows; a consumer zero-fills between `from` and `to`.
 */
export type EntityStatsResponse<
    G extends Record<string, any> = Record<string, unknown>,
    M extends Record<string, any> = Record<string, unknown>,
> = {
    data: EntityStatsBucket<G>[],
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
