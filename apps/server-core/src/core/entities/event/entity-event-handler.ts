/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { EntityDefaultEventName, EventName, EventScope } from '@authup/core-kit';
import { isObject } from '@authup/kit';
import type { DomainEventPublishContext, IDomainEventHandler } from '@authup/server-kit';
import { buildEntityDiff } from './diff.ts';
import type {
    EntityEventHandlerOptions,
    EventRequestContext,
    IEventService,
} from './types.ts';

export type EntityEventHandlerContext = {
    eventService: IEventService,
    requestContext?: () => EventRequestContext | undefined,
    options?: EntityEventHandlerOptions,
};

const ENTITY_EVENT_NAME_MAP : Record<string, `${EventName}`> = {
    [EntityDefaultEventName.CREATED]: EventName.CREATED,
    [EntityDefaultEventName.UPDATED]: EventName.UPDATED,
    [EntityDefaultEventName.DELETED]: EventName.DELETED,
};

/**
 * Bridges every entity create/update/delete published on the
 * DomainEventPublisher bus into the auth_events audit table (scope `entity`).
 */
export class EntityEventHandler implements IDomainEventHandler {
    protected eventService : IEventService;

    protected requestContext? : () => EventRequestContext | undefined;

    protected options : EntityEventHandlerOptions;

    constructor(ctx: EntityEventHandlerContext) {
        this.eventService = ctx.eventService;
        this.requestContext = ctx.requestContext;
        this.options = ctx.options ?? {};
    }

    async handle(ctx: DomainEventPublishContext): Promise<void> {
        try {
            // recursion guard — no event subscriber exists today (the
            // auth_events entity is deliberately subscriber-less), so this is
            // defense in depth against an audit-write feedback loop.
            if (ctx.content.type === 'event') {
                return;
            }

            const name = ENTITY_EVENT_NAME_MAP[ctx.content.event];
            if (!name) {
                return;
            }

            // v1 semantics: realm attribution reads the entity's own realm_id
            // column — junction rows (rolePermission, userRole, ...) carry no
            // realm_id column and stay realm-less (null).
            const refId = ctx.content.data?.id ?? null;
            const realmId = ctx.content.data?.realm_id ?? null;

            const requestContext = this.requestContext ?
                this.requestContext() :
                undefined;

            let data : Record<string, any> | null = null;
            if (name === EventName.UPDATED && isObject(ctx.content.data) && isObject(ctx.dataPrevious)) {
                const diff = buildEntityDiff(ctx.content.data, ctx.dataPrevious);
                if (Object.keys(diff).length > 0) {
                    data = { diff };
                }
            }

            await this.eventService.record({
                scope: EventScope.ENTITY,
                name,
                refType: ctx.content.type,
                refId,
                realmId,
                actorType: requestContext?.actorType ?? null,
                actorId: requestContext?.actorId ?? null,
                actorName: requestContext?.actorName ?? null,
                requestPath: requestContext?.requestPath ?? null,
                requestMethod: requestContext?.requestMethod ?? null,
                requestIpAddress: requestContext?.requestIpAddress ?? null,
                requestUserAgent: requestContext?.requestUserAgent ?? null,
                data,
                retentionDays: this.options.retentionDays,
            });
        } catch {
            // record() never throws, but the bridge itself must also never
            // fail the originating publish.
        }
    }
}
