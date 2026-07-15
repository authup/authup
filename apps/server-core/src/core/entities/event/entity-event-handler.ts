/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    EntityDefaultEventName,
    EntityType,
    EventName,
    EventScope,
} from '@authup/core-kit';
import { hasOwnProperty, isObject } from '@authup/kit';
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

const ENTITY_REALM_KEY_MAP : Record<`${EntityType}`, string> = {
    [EntityType.CLIENT]: 'realm_id',
    [EntityType.CLIENT_PERMISSION]: 'client_realm_id',
    [EntityType.CLIENT_ROLE]: 'client_realm_id',
    [EntityType.CLIENT_SCOPE]: 'client_realm_id',
    [EntityType.CONSENT]: 'realm_id',
    [EntityType.EVENT]: 'realm_id',
    [EntityType.IDENTITY_PROVIDER]: 'realm_id',
    [EntityType.IDENTITY_PROVIDER_ACCOUNT]: 'user_realm_id',
    [EntityType.IDENTITY_PROVIDER_ATTRIBUTE]: 'realm_id',
    [EntityType.IDENTITY_PROVIDER_ATTRIBUTE_MAPPING]: 'provider_realm_id',
    [EntityType.IDENTITY_PROVIDER_PERMISSION_MAPPING]: 'provider_realm_id',
    [EntityType.IDENTITY_PROVIDER_ROLE_MAPPING]: 'provider_realm_id',
    [EntityType.KEY]: 'realm_id',
    [EntityType.POLICY]: 'realm_id',
    [EntityType.POLICY_ATTRIBUTE]: 'realm_id',
    [EntityType.PERMISSION]: 'realm_id',
    [EntityType.PERMISSION_POLICY]: 'permission_realm_id',
    [EntityType.REALM]: 'id',
    [EntityType.ROBOT]: 'realm_id',
    [EntityType.ROBOT_PERMISSION]: 'robot_realm_id',
    [EntityType.ROBOT_ROLE]: 'robot_realm_id',
    [EntityType.ROLE]: 'realm_id',
    [EntityType.ROLE_ATTRIBUTE]: 'realm_id',
    [EntityType.ROLE_PERMISSION]: 'role_realm_id',
    [EntityType.SCOPE]: 'realm_id',
    [EntityType.SESSION]: 'realm_id',
    [EntityType.TRUST_ANCHOR]: 'realm_id',
    [EntityType.USER]: 'realm_id',
    [EntityType.USER_ATTRIBUTE]: 'realm_id',
    [EntityType.USER_PERMISSION]: 'user_realm_id',
    [EntityType.USER_ROLE]: 'user_realm_id',
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

            const refId = ctx.content.data?.id ?? null;
            const realmIdCurrent = resolveEntityRealmId(ctx.content.type, ctx.content.data);
            const realmId = typeof realmIdCurrent === 'undefined' ?
                (resolveEntityRealmId(ctx.content.type, ctx.dataPrevious) ?? null) :
                realmIdCurrent;

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

function resolveEntityRealmId(
    type: string,
    data: unknown,
): string | null | undefined {
    if (!isObject(data)) {
        return undefined;
    }

    const key = ENTITY_REALM_KEY_MAP[type as `${EntityType}`] ?? 'realm_id';
    if (!hasOwnProperty(data, key)) {
        return undefined;
    }

    return typeof data[key] === 'string' ? data[key] : null;
}
