/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityStatsMeta, EntityStatsRow, StatsBucketUnit } from '@authup/core-http-kit';
import type { ActorContext } from '@authup/server-kit';
import type { IQuery, Schema } from '@rapiq/core';
import type { ReadScope } from '../query/scope.ts';

export interface IEntityStatsRepository {
    /**
     * Grouped rows for a grouped query, rapiq's normalized shape: one row
     * per group, keyed by the group and aggregate output keys.
     */
    aggregate(query: IQuery): Promise<Record<string, unknown>[]>;

    /**
     * Every row the query admits.
     */
    count(query: IQuery): Promise<number>;
}

export type StatsWindow = {
    unit: StatsBucketUnit,
    /**
     * The lower bound, snapped onto the start of its bucket.
     */
    from: string,
    /**
     * The upper bound, else the instant of the read.
     */
    to: string,
    /**
     * Whether the filter carries the upper bound itself. When it does not,
     * `to` is appended as one.
     */
    upperBound: boolean,
    buckets: number,
};

export type StatsWindowOptions = {
    dateColumn: string,
    now: Date,
    /**
     * How far back raw rows reach, in days: an hour bucket past it is
     * refused. Absent or 0 means never pruned.
     */
    rawHorizonDays?: number,
};

export type EntityStatsDefinition = {
    /**
     * Names the statistic in the cache key.
     */
    type: string,
    /**
     * The vocabulary: the entity's own list schema, whose `groups` and
     * `aggregates` blocks declare what may be grouped and counted.
     */
    schema: Schema<any>,
    repository: IEntityStatsRepository,
    /**
     * The bucketed column. Defaults to `createdAt`.
     */
    dateColumn?: string,
    /**
     * How far back raw rows reach for the (gated) query, in days: an hour
     * read past it, and a day or month read the rollups do not answer,
     * are refused. Absent or 0 means never pruned.
     */
    rawHorizonDays?: (query: IQuery) => number,
    /**
     * Persisted daily counts answering day and month reads whose query
     * references stored columns only.
     */
    rollup?: EntityStatsRollup,
    /**
     * The column the route realm (`/realms/:realmId/...`) constrains.
     * Defaults to `realmId`; `null` for an entity without one.
     */
    realmColumn?: string | null,
    /**
     * The entity list's own gate. Absent for an anonymous list.
     */
    scope?: (query: IQuery, actor: ActorContext) => Promise<ReadScope>,
    /**
     * Extra response meta, cached with the read (events: `enabled`, the raw
     * retentions and the rollup coverage).
     */
    meta?: () => Record<string, any> | Promise<Record<string, any>>,
};

export type EntityStatsRollup = {
    /**
     * The columns the rollup stored, in the entity schema's vocabulary.
     */
    columns: string[],
    repository: IEntityStatsRepository,
    /**
     * The raw-vocabulary grouped query onto the rollup table, undefined
     * when the rollup cannot answer it.
     */
    translate: (query: IQuery) => IQuery | undefined,
    /**
     * A rollup row back into the raw vocabulary.
     */
    translateRow: (row: Record<string, unknown>) => Record<string, unknown>,
    /**
     * How far back the rollups reach, in days (0 = never pruned): a window
     * past it reads raw rows, or is refused past the raw horizon too.
     */
    horizonDays?: () => number,
};

export type EntityStatsReadOptions = {
    realmId?: string,
};

export type EntityStatsResult<
    G extends Record<string, any> = Record<string, unknown>,
    M extends Record<string, any> = Record<string, unknown>,
> = {
    data: EntityStatsRow<G>[],
    meta: Omit<EntityStatsMeta, 'schema'> & M,
};

export interface IEntityStatsService<
    G extends Record<string, any> = Record<string, unknown>,
    M extends Record<string, any> = Record<string, unknown>,
> {
    /**
     * Grouped counts over a window plus the window-independent total. The
     * query's `filter`, `group` and `aggregate` decode through the entity
     * schema; the first group buckets the date column and the filter bounds
     * it from below. Gated exactly like the list, except that a reach which
     * does not lower counts the actor's own rows only. Served from the cache
     * within its ttl.
     */
    getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options?: EntityStatsReadOptions,
    ): Promise<EntityStatsResult<G, M>>;
}
