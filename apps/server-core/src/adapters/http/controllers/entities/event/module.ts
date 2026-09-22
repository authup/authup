/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DContext,
    DController,
    DGet,
    DPath,
    DTags,
} from '@routup/decorators';
import type { Event, EventName, EventScope } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    EntityCollectionResponse,
    EntityRecordResponse,
    EventStatsResponse,
} from '@authup/core-http-kit';
import type { IEntityStatsService, IEventService } from '../../../../../core/index.ts';
import {
    FILTERS_QUERY_PARAMETERS,
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    eventSchema,
} from '../../../../../core/index.ts';
import { DQuerySchema } from '../../../decorators/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext, getRequestRealmID } from '../../../request/index.ts';
import { serveEntityStats } from '../stats.ts';

export type EventControllerContext = {
    service: IEventService,
    statsService: IEntityStatsService<{ scope: `${EventScope}`, name: `${EventName}` }, { enabled: boolean }>,
};

// Read-only surface — the log is append-only: writes happen internally via
// IEventService.record(), pruning is the retention sweep's job.
@DTags('event')
@DController(['/events', '/realms/:realmId/events'])
export class EventController {
    protected service: IEventService;

    protected statsService: IEntityStatsService<{ scope: `${EventScope}`, name: `${EventName}` }, { enabled: boolean }>;

    constructor(ctx: EventControllerContext) {
        this.service = ctx.service;
        this.statsService = ctx.statsService;
    }

    /**
     * Declared before the record read on purpose: `/:id` would otherwise
     * take the `@stats` segment as an id.
     */
    @DQuerySchema(EntityType.EVENT, 'stats')
    @DGet('/@stats', [ForceLoggedInMiddleware])
    async getStats(
        @DContext() event: IAppEvent,
    ): Promise<EventStatsResponse> {
        return serveEntityStats(
            event,
            this.statsService,
            describeQuerySchema(eventSchema, FILTERS_QUERY_PARAMETERS),
        );
    }

    @DQuerySchema(EntityType.EVENT, 'collection')
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<Event>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(
            useRequestQuery(event),
            actor,
            { realmId: getRequestRealmID(event) },
        );

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(eventSchema),
            },
        };
    }

    @DQuerySchema(EntityType.EVENT, 'record')
    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<Event>> {
        const actor = buildActorContext(event);

        const entity = await this.service.getOne(id, actor, { realmId: getRequestRealmID(event) });

        return { data: entity, meta: { schema: describeQuerySchema(eventSchema, RECORD_QUERY_PARAMETERS) } };
    }
}
