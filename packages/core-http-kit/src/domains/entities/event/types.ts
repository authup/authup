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
     * How long a security event is kept, in days (`eventLogRetentionDays`,
     * 0 = forever). A window reaching past it counts fewer rows than
     * happened.
     */
    retentionDays: number,
    /**
     * How long an entity create/update/delete event is kept, in days
     * (`eventLogEntityRetentionDays`, 0 = forever). Updates and deletions are
     * recorded nowhere else, so a window past it undercounts them.
     */
    entityRetentionDays: number,
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
