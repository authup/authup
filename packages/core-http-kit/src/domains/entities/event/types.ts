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
} from '@authup/core-kit';
import type {
    EntityStatsMeta,
    EntityStatsQuery,
    EntityStatsRow,
    IEntitySchemaAPI,
    IEntityStatsAPI,
} from '../../stats';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export type EventStatsQuery = EntityStatsQuery<Event>;

/**
 * The keys an event bucket is grouped by next to its time bucket.
 */
export type EventStatsGroups = {
    scope: `${EventScope}`,
    name: `${EventName}`,
    refType?: string | null,
};

/**
 * One grouped row: the events of one (scope, name) inside one bucket.
 */
export type EventStatsRow = EntityStatsRow<EventStatsGroups>;

export type EventStatsMetaExtra = {
    /**
     * Whether the deployment records events at all (`eventLogEnabled`).
     * With it off nothing new lands in the counts, and a dashboard should
     * say so rather than render a flat line.
     */
    enabled: boolean,
    /**
     * How long a raw security event is kept, in days (`eventLogRetentionDays`,
     * 0 = forever): how far back an hour bucket reaches. A day or month
     * bucket may reach further, through the rollups (`aggregateFrom`).
     */
    retentionDays: number,
    /**
     * How long a raw entity create/update/delete event is kept, in days
     * (`eventLogEntityRetentionDays`, 0 = forever), the `retentionDays` of
     * `scope=entity` (`entityAggregateFrom` for the rollups).
     */
    entityRetentionDays: number,
    /**
     * The oldest UTC day (`YYYY-MM-DD`) the daily rollups hold for the
     * scopes other than `entity`, or null when they hold none. A day or
     * month window starting on or after it is answered in full.
     */
    aggregateFrom: string | null,
    /**
     * The same for `scope=entity`, whose raw rows expire on their own clock.
     */
    entityAggregateFrom: string | null,
};

export type EventStatsMeta = EntityStatsMeta & EventStatsMetaExtra;

export type EventStatsResponse = {
    data: EventStatsRow[],
    meta: EventStatsMeta,
};

/**
 * Read-only client — the audit log is append-only: rows are written
 * server-side at the emit points and pruned by the retention sweep.
 */
export interface IEventAPI extends IEntitySchemaAPI,
    IEntityStatsAPI<Event, EventStatsGroups, EventStatsMetaExtra> {
    getMany(data?: EntityQueryInput<Event>): Promise<EntityCollectionResponse<Event>>;

    getOne(id: Event['id'], record?: EntityQueryInput<Event>): Promise<EntityRecordResponse<Event>>;
}
