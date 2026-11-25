/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ReadScope } from '@authup/access';
import { randomUUID } from 'node:crypto';
import {
    BuiltInPolicyType,
    PermissionError,
    appendQueryConditions,
    evaluateRecord,
    reachesRecord,
    scopeReadQuery,
} from '@authup/access';
import {
    Query,
    Sort,
    Sorts,
    and,
    eq,
    lt,
} from '@rapiq/core';
import type { IQuery } from '@rapiq/core';
import { EventScope, PermissionName } from '@authup/core-kit';
import type { Event } from '@authup/core-kit';
import { EntityNotFoundError } from '@authup/errors';
import { buildUUIDv7LowerBound, createUUIDv7 } from '@authup/kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { ActorContext, EntityRepositoryFindManyResult, Logger } from '@authup/server-kit';
import { EVENT_ACTOR_NAME_MAX_LENGTH, EVENT_LOG_RETENTION_DAYS_DEFAULT } from './constants.ts';
import { sanitizeEventData } from './sanitize.ts';
import type {
    EventReadVisibility,
    EventRecordInput,
    EventServiceOptions,
    EventServiceReadOptions,
    IEventRepository,
    IEventService,
} from './types.ts';
import {
    decodeQuery,
    readResponseAttributeNames,
    trimReachCheckFields,
    widenToSchema,
} from '../../query/index.ts';
import { eventSchema } from './schema.ts';

export type EventServiceContext = {
    repository: IEventRepository,
    options?: EventServiceOptions,
    logger?: Logger,
    clock?: () => number,
};

const DAY_IN_MS = 86_400_000;

const FEED_SETTLE_SECONDS_DEFAULT = 10;

export class EventService extends AbstractEntityService implements IEventService {
    protected repository: IEventRepository;

    protected options: EventServiceOptions;

    protected logger?: Logger;

    protected clock: () => number;

    constructor(ctx: EventServiceContext) {
        super();

        this.repository = ctx.repository;
        this.options = ctx.options ?? {};
        this.logger = ctx.logger;
        this.clock = ctx.clock ?? Date.now;
    }

    protected isOwnedBy(entity: Event, actor: ActorContext): boolean {
        return !!actor.identity &&
            !!entity.actorId &&
            entity.actorId === actor.identity.data.id &&
            entity.actorType === actor.identity.type;
    }

    protected async canReadRealm(actor: ActorContext, realmId: string | null): Promise<boolean> {
        return reachesRecord(actor.permissionEvaluator, {
            name: PermissionName.EVENT_READ,
            realm: realmId,
            options: {
                policiesIncluded: [
                    BuiltInPolicyType.COMPOSITE,
                    BuiltInPolicyType.PERMISSION_BINDING,
                    BuiltInPolicyType.REALM_MATCH,
                ],
            },
        });
    }

    protected async resolveReadVisibility(actor: ActorContext): Promise<EventReadVisibility | undefined> {
        const actorRealmId = this.getActorRealmId(actor);
        let foreignRealmId = randomUUID();

        while (foreignRealmId === actorRealmId) {
            foreignRealmId = randomUUID();
        }

        if (await this.canReadRealm(actor, foreignRealmId)) {
            return undefined;
        }

        const realmIds: Array<string | null> = [];

        if (actorRealmId && await this.canReadRealm(actor, actorRealmId)) {
            realmIds.push(actorRealmId);
        }

        if (await this.canReadRealm(actor, null)) {
            realmIds.push(null);
        }

        return {
            realmIds,
            ...(actor.identity ? {
                owner: {
                    actorId: actor.identity.data.id,
                    actorType: actor.identity.type,
                },
            } : {}),
        };
    }

    async record(input: EventRecordInput): Promise<void> {
        const data = sanitizeEventData(input.data);

        // complementary structured log line — fires even when persistence is
        // disabled, so a SIEM/Loki pipeline can pick the events up for free.
        this.logger?.info(`audit: ${input.scope}.${input.name}`, {
            scope: input.scope,
            name: input.name,
            refType: input.refType ?? null,
            refId: input.refId ?? null,
            clientId: input.clientId ?? null,
            sessionId: input.sessionId ?? null,
            actorType: input.actorType ?? null,
            actorId: input.actorId ?? null,
            realmId: input.realmId ?? null,
            ...(data ? { data } : {}),
        });

        if (this.options.enabled === false) {
            return;
        }

        try {
            const retentionDays = input.retentionDays ?? this.options.retentionDays ?? EVENT_LOG_RETENTION_DAYS_DEFAULT;

            const entity = this.repository.create({
                id: createUUIDv7(),
                scope: input.scope,
                name: input.name,
                refType: truncate(input.refType, 64),
                refId: truncate(input.refId, 64),
                clientId: input.clientId ?? null,
                sessionId: input.sessionId ?? null,
                actorType: input.actorType ?? null,
                actorId: input.actorId ?? null,
                actorName: truncate(input.actorName, EVENT_ACTOR_NAME_MAX_LENGTH),
                requestPath: truncate(input.requestPath, 256),
                requestMethod: truncate(input.requestMethod, 10),
                requestIpAddress: truncate(input.requestIpAddress, 45),
                requestUserAgent: truncate(input.requestUserAgent, 512),
                realmId: input.realmId ?? null,
                data,
                expiring: retentionDays > 0,
                expiresAt: retentionDays > 0 ?
                    new Date(Date.now() + (retentionDays * DAY_IN_MS)).toISOString() :
                    null,
            });

            await this.repository.save(entity, { transaction: input.transaction });
        } catch {
            // an audit write failure must never fail the originating operation
            // from here; a save that joined the write's transaction can still
            // have doomed it on postgres, see EventRepositoryAdapter.save
            this.logger?.warn(`Recording the audit event ${input.scope}.${input.name} failed.`);
        }
    }

    async scopeRead(query: IQuery, actor: ActorContext): Promise<ReadScope> {
        return scopeReadQuery(query, actor.permissionEvaluator, {
            names: [PermissionName.EVENT_READ],
            ownership: actor.identity ?
                and(eq('actorId', actor.identity.data.id), eq('actorType', actor.identity.type)) :
                null,
            selfService: true,
            widen: widenToSchema(eventSchema),
            retain: ['actorId', 'actorType'],
        });
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: EventServiceReadOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Event>> {
        const parsed = await decodeQuery(query, { schema: eventSchema, actor });
        const realm = options.realmId ? { realmId: options.realmId } : {};

        // Compile EVENT_READ into a row condition (#3286 phase 3). Own rows are
        // always readable ("my sign-in history"), so ownership composes as an
        // OR-alternative, and stands alone for an actor without the permission.
        // A non-expressible policy falls back to the probe + per-row loop below.
        const scope = await this.scopeRead(parsed, actor);

        if (!scope.post) {
            return this.repository.findMany(scope.query, realm);
        }

        const visibility = await this.resolveReadVisibility(actor);
        const { data: entities, meta } = await this.repository.findMany(scope.query, {
            ...realm,
            ...(visibility ? { visibility } : {}),
        });

        const data: Event[] = [];

        for (const entity of entities) {
            if (this.isOwnedBy(entity, actor)) {
                data.push(entity);

                continue;
            }

            const reached = await reachesRecord(actor.permissionEvaluator, {
                name: PermissionName.EVENT_READ,
                realm: entity.realmId,
                data: {
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    [BuiltInPolicyType.ATTRIBUTE_NAMES]: readResponseAttributeNames(entity, scope.query),
                },
            });

            if (reached) {
                data.push(entity);
            }
        }

        trimReachCheckFields(data, scope.query);

        return {
            data,
            meta,
        };
    }

    async getFeed(
        query: Record<string, any>,
        actor: ActorContext,
        options: EventServiceReadOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Event>> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.EVENT_READ });

        const parsed = await decodeQuery(query, { schema: eventSchema, actor });

        // A per-row filtered page could drop every row, which reads as
        // "caught up" and leaves the consumer no id to advance past.
        const scope = await this.scopeRead(parsed, actor);

        if (scope.post) {
            throw new PermissionError({ message: `The event feed requires a ${PermissionName.EVENT_READ} reach expressible as a row condition.` });
        }

        const settleSeconds = this.options.feedSettleSeconds ?? FEED_SETTLE_SECONDS_DEFAULT;
        const sorted = new Query({
            fields: scope.query.fields,
            filters: scope.query.filters,
            relations: scope.query.relations,
            pagination: scope.query.pagination,
            sorts: new Sorts([new Sort('id', 'ASC')]),
            groups: scope.query.groups,
            aggregates: scope.query.aggregates,
        });

        return this.repository.findMany(
            appendQueryConditions(
                sorted,
                eq('scope', EventScope.ENTITY),
                lt('id', buildUUIDv7LowerBound(this.clock() - (settleSeconds * 1000))),
            ),
            options.realmId ? { realmId: options.realmId } : {},
        );
    }

    async getOne(id: string, actor: ActorContext, options: EventServiceReadOptions = {}): Promise<Event> {
        const entity = await this.repository.findOneById(id);

        if (!entity || (options.realmId && entity.realmId !== options.realmId)) {
            throw new EntityNotFoundError();
        }

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.EVENT_READ });
            await evaluateRecord(actor.permissionEvaluator, {
                name: PermissionName.EVENT_READ,
                realm: entity.realmId,
                data: { [BuiltInPolicyType.ATTRIBUTES]: entity },
            });
        }

        return entity;
    }
}

function truncate(value: string | null | undefined, maxLength: number): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    if (value.length <= maxLength) {
        return value;
    }

    return value.substring(0, maxLength);
}
