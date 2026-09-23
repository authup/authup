/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EntityStatsBucket,
    EntityStatsMeta,
    StatsGranularity,
} from '@authup/core-http-kit';
import type { ActorContext } from '@authup/server-kit';
import type { IQuery, Schema } from '@rapiq/core';
import type { ReadScope } from '../query/scope.ts';

export type EntityStatsParameters = {
    granularity?: `${StatsGranularity}`,
    days?: number,
};

export type EntityStatsCountGroupedOptions = {
    granularity: `${StatsGranularity}`,
    /**
     * The column bucketed by, a timestamp column of the entity.
     */
    dateColumn: string,
    /**
     * Columns grouped by next to the bucket, reported under their own name.
     */
    groupBy: string[],
};

export interface IEntityStatsRepository {
    /**
     * Grouped counts: one row per (bucket, ...groupBy) holding rows. The
     * query carries the filter, the reach and the window.
     */
    countGrouped(
        query: IQuery,
        options: EntityStatsCountGroupedOptions,
    ): Promise<EntityStatsBucket<Record<string, any>>[]>;

    /**
     * Every row the query admits.
     */
    count(query: IQuery): Promise<number>;
}

export type EntityStatsDefinition = {
    /**
     * Names the statistic in the cache key.
     */
    type: string,
    /**
     * The filter vocabulary: the entity's own list schema.
     */
    schema: Schema<any>,
    repository: IEntityStatsRepository,
    /**
     * Defaults to `createdAt`.
     */
    dateColumn?: string,
    groupBy?: string[],
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
     * Extra response meta (events: `enabled`).
     */
    meta?: () => Record<string, any>,
};

export type EntityStatsReadOptions = {
    realmId?: string,
};

export type EntityStatsResult<
    G extends Record<string, any> = Record<string, unknown>,
    M extends Record<string, any> = Record<string, unknown>,
> = {
    data: EntityStatsBucket<G>[],
    meta: Omit<EntityStatsMeta, 'schema'> & M,
};

export interface IEntityStatsService<
    G extends Record<string, any> = Record<string, unknown>,
    M extends Record<string, any> = Record<string, unknown>,
> {
    /**
     * Grouped counts over a window plus the window-independent total. The
     * query's `filter` decodes through the entity schema like the list
     * read's; `granularity` and `days` are its own. Gated exactly like the
     * list, except that a reach which does not lower counts the actor's own
     * rows only. Served from the cache within its ttl.
     */
    getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options?: EntityStatsReadOptions,
    ): Promise<EntityStatsResult<G, M>>;
}
