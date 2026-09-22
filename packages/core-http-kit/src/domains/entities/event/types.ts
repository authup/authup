/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { EntityQueryInput } from '../../../helpers';
import type {
    Event,
    EventName,
    EventScope,
    EventStatsGranularity,
} from '@authup/core-kit';
import type { QueryBuildInput, SchemaDescription } from '@rapiq/core';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export type EventStatsQuery = {
    /**
     * The rows to count, in the event schema's filter vocabulary (the same
     * `filter[...]` the collection read takes; a realm switcher's scope is
     * `{ realmId: [<id>, null] }`). The window is NOT a filter: see `days`.
     */
    filters?: QueryBuildInput<Event>['filters'],
    /**
     * The bucket width. Defaults to `day`.
     */
    granularity?: `${EventStatsGranularity}`,
    /**
     * The window, in whole days back from now. Defaults to 30. The window
     * times the buckets per day must not exceed the server's bucket ceiling.
     * Bound server-side as a wall-clock instant, because a `createdAt`
     * filter does not compare correctly on every dialect.
     */
    days?: number,
};

/**
 * One grouped count: the rows of one (scope, name) inside one bucket.
 */
export type EventStatsBucket = {
    /**
     * The bucket start, an ISO instant in UTC.
     */
    bucket: string,
    scope: `${EventScope}`,
    name: `${EventName}`,
    count: number,
};

export type EventStatsMeta = {
    /**
     * The window start, snapped onto a bucket boundary.
     */
    from: string,
    /**
     * The window end, the instant the counts were taken.
     */
    to: string,
    granularity: `${EventStatsGranularity}`,
    days: number,
    /**
     * Whether the deployment records events at all (`eventLogEnabled`).
     * With it off nothing new lands in the counts, and a dashboard should
     * say so rather than render a flat line.
     */
    enabled: boolean,
    /**
     * The filter vocabulary this read decodes.
     */
    schema: SchemaDescription,
};

/**
 * Deliberately not the entity envelope: a bucket is not an entity. Absent
 * buckets hold no rows; a consumer zero-fills between `from` and `to`.
 */
export type EventStatsResponse = {
    data: EventStatsBucket[],
    meta: EventStatsMeta,
};

/**
 * Read-only client — the audit log is append-only: rows are written
 * server-side at the emit points and pruned by the retention sweep.
 */
export interface IEventAPI {
    getMany(data?: EntityQueryInput<Event>): Promise<EntityCollectionResponse<Event>>;

    getOne(id: Event['id'], record?: EntityQueryInput<Event>): Promise<EntityRecordResponse<Event>>;

    /**
     * Grouped counts over the window, the dashboard's read (`GET /events/stats`).
     */
    getStats(query?: EventStatsQuery): Promise<EventStatsResponse>;
}
