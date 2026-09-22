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
import type { Event } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    EntityCollectionResponse,
    EntityRecordResponse,
    EventStatsResponse,
} from '@authup/core-http-kit';
import type { IEventService, IEventStatsService } from '../../../../../core/index.ts';
import {
    FILTERS_QUERY_PARAMETERS,
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    eventSchema,
} from '../../../../../core/index.ts';
import { DQuerySchema } from '../../../decorators/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext, getRequestRealmID } from '../../../request/index.ts';

export type EventControllerContext = {
    service: IEventService,
    statsService: IEventStatsService,
};

// Read-only surface — the log is append-only: writes happen internally via
// IEventService.record(), pruning is the retention sweep's job.
@DTags('event')
@DController(['/events', '/realms/:realmId/events'])
export class EventController {
    protected service: IEventService;

    protected statsService: IEventStatsService;

    constructor(ctx: EventControllerContext) {
        this.service = ctx.service;
        this.statsService = ctx.statsService;
    }

    /**
     * Declared before the record read on purpose: `stats` is no uuid, and a
     * uuid column compared against it is a 500 on postgres.
     */
    @DQuerySchema(EntityType.EVENT, 'filters')
    @DGet('/stats', [ForceLoggedInMiddleware])
    async getStats(
        @DContext() event: IAppEvent,
    ): Promise<EventStatsResponse> {
        const actor = buildActorContext(event);

        const { data, meta } = await this.statsService.getMany(
            useRequestQuery(event),
            actor,
            { realmId: getRequestRealmID(event) },
        );

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(eventSchema, FILTERS_QUERY_PARAMETERS),
            },
        };
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
