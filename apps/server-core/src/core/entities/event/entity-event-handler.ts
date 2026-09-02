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

/**
 * Entity types whose rows are generic (name, value) pairs. Their payload
 * column is always called `value`, so {@link buildEntityDiff}'s key-name
 * denylist cannot see what it holds - and for an identity provider it holds
 * the OAuth2 `clientSecret` or the LDAP bind password. The diff is dropped
 * wholesale rather than the denylist widened, because no regex over the
 * column name can ever decide this.
 */
const ENTITY_OPAQUE_VALUE_TYPES = new Set<string>([
    EntityType.IDENTITY_PROVIDER_ATTRIBUTE,
    EntityType.POLICY_ATTRIBUTE,
    EntityType.ROLE_ATTRIBUTE,
    EntityType.USER_ATTRIBUTE,
]);

const ENTITY_REALM_KEY_MAP : Record<`${EntityType}`, string> = {
    [EntityType.CLIENT]: 'realmId',
    [EntityType.CLIENT_PERMISSION]: 'clientRealmId',
    [EntityType.CLIENT_ROLE]: 'clientRealmId',
    [EntityType.CLIENT_SCOPE]: 'clientRealmId',
    [EntityType.CONSENT]: 'realmId',
    // Unreachable in practice: auth_session_tokens has no entity subscriber,
    // so no domain event is ever published for it. Present for exhaustiveness,
    // and the key is the one it would resolve through if that changed.
    [EntityType.SESSION_TOKEN]: 'sessionId',
    [EntityType.EVENT]: 'realmId',
    [EntityType.IDENTITY_PROVIDER]: 'realmId',
    [EntityType.IDENTITY_PROVIDER_ACCOUNT]: 'userRealmId',
    [EntityType.IDENTITY_PROVIDER_ATTRIBUTE]: 'realmId',
    [EntityType.IDENTITY_PROVIDER_ATTRIBUTE_MAPPING]: 'providerRealmId',
    [EntityType.IDENTITY_PROVIDER_PERMISSION_MAPPING]: 'providerRealmId',
    [EntityType.IDENTITY_PROVIDER_ROLE_MAPPING]: 'providerRealmId',
    [EntityType.KEY]: 'realmId',
    [EntityType.POLICY]: 'realmId',
    [EntityType.POLICY_ATTRIBUTE]: 'realmId',
    [EntityType.PERMISSION]: 'realmId',
    [EntityType.PERMISSION_POLICY]: 'permissionRealmId',
    [EntityType.REALM]: 'id',
    [EntityType.ROLE]: 'realmId',
    [EntityType.ROLE_ATTRIBUTE]: 'realmId',
    [EntityType.ROLE_PERMISSION]: 'roleRealmId',
    [EntityType.SCOPE]: 'realmId',
    [EntityType.SESSION]: 'realmId',
    [EntityType.TRUST_ANCHOR]: 'realmId',
    [EntityType.USER]: 'realmId',
    [EntityType.USER_ATTRIBUTE]: 'realmId',
    [EntityType.USER_AUTHENTICATOR]: 'realmId',
    [EntityType.USER_PERMISSION]: 'userRealmId',
    [EntityType.USER_ROLE]: 'userRealmId',
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
            if (ctx.content.type === EntityType.EVENT) {
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
            if (
                name === EventName.UPDATED &&
                !ENTITY_OPAQUE_VALUE_TYPES.has(ctx.content.type) &&
                isObject(ctx.content.data) &&
                isObject(ctx.dataPrevious)
            ) {
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
                sessionId: requestContext?.sessionId ?? null,
                requestPath: requestContext?.requestPath ?? null,
                requestMethod: requestContext?.requestMethod ?? null,
                requestIpAddress: requestContext?.requestIpAddress ?? null,
                requestUserAgent: requestContext?.requestUserAgent ?? null,
                data,
                retentionDays: this.options.retentionDays,
                transaction: ctx.transaction,
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

    const key = ENTITY_REALM_KEY_MAP[type as `${EntityType}`] ?? 'realmId';
    if (!hasOwnProperty(data, key)) {
        return undefined;
    }

    return typeof data[key] === 'string' ? data[key] : null;
}
