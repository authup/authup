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
    EntityStatsBucket,
    EntityStatsMeta,
    EntityStatsQuery,
    IEntitySchemaAPI,
    IEntityStatsAPI,
} from '../../stats';
import type { EntityCollectionResponse, EntityRecordResponse } from '../../types-base';

export type EventStatsQuery = EntityStatsQuery<Event>;

/**
 * One grouped count: the rows of one (scope, name) inside one bucket.
 */
export type EventStatsBucket = EntityStatsBucket<{
    scope: `${EventScope}`,
    name: `${EventName}`,
}>;

export type EventStatsMeta = EntityStatsMeta & {
    /**
     * Whether the deployment records events at all (`eventLogEnabled`).
     * With it off nothing new lands in the counts, and a dashboard should
     * say so rather than render a flat line.
     */
    enabled: boolean,
};

export type EventStatsResponse = {
    data: EventStatsBucket[],
    meta: EventStatsMeta,
};

/**
 * Read-only client — the audit log is append-only: rows are written
 * server-side at the emit points and pruned by the retention sweep.
 */
export interface IEventAPI extends IEntitySchemaAPI,
    IEntityStatsAPI<Event, { scope: `${EventScope}`, name: `${EventName}` }, { enabled: boolean }> {
    getMany(data?: EntityQueryInput<Event>): Promise<EntityCollectionResponse<Event>>;

    getOne(id: Event['id'], record?: EntityQueryInput<Event>): Promise<EntityRecordResponse<Event>>;
}
