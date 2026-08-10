/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import {
    and, 
    eq, 
    inArray, 
    or,
} from '@rapiq/core';
import { PermissionName } from '@authup/core-kit';
import type { Event } from '@authup/core-kit';
import { EntityNotFoundError } from '@authup/errors';
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
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { eventSchema } from './schema.ts';

export type EventServiceContext = {
    repository: IEventRepository,
    options?: EventServiceOptions,
    logger?: Logger,
};

const DAY_IN_MS = 86_400_000;

export class EventService extends AbstractEntityService implements IEventService {
    protected repository: IEventRepository;

    protected options: EventServiceOptions;

    protected logger?: Logger;

    constructor(ctx: EventServiceContext) {
        super();

        this.repository = ctx.repository;
        this.options = ctx.options ?? {};
        this.logger = ctx.logger;
    }

    protected isOwnedBy(entity: Event, actor: ActorContext): boolean {
        return !!actor.identity &&
            !!entity.actorId &&
            entity.actorId === actor.identity.data.id &&
            entity.actorType === actor.identity.type;
    }

    protected async canReadRealm(actor: ActorContext, realmId: string | null): Promise<boolean> {
        try {
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.EVENT_READ,
                data: definePolicyData({ [BuiltInPolicyType.REALM_MATCH]: realmId }),
                options: {
                    policiesIncluded: [
                        BuiltInPolicyType.COMPOSITE,
                        BuiltInPolicyType.PERMISSION_BINDING,
                        BuiltInPolicyType.REALM_MATCH,
                    ],
                },
            });
            return true;
        } catch {
            return false;
        }
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
                id: randomUUID(),
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

            await this.repository.save(entity);
        } catch {
            // an audit write failure must never fail the originating operation
            this.logger?.warn(`Recording the audit event ${input.scope}.${input.name} failed.`);
        }
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options: EventServiceReadOptions = {},
    ): Promise<EntityRepositoryFindManyResult<Event>> {
        const parsed = await decodeQuery(query, { schema: eventSchema, actor });

        let canReadAll = true;
        try {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.EVENT_READ });
        } catch (e) {
            if (!actor.identity) {
                throw e;
            }
            canReadAll = false;
        }

        if (!canReadAll) {
            // self-service: only the actor's own rows ("my sign-in history")
            return this.repository.findMany(parsed, {
                owner: {
                    actorId: actor.identity!.data.id,
                    actorType: actor.identity!.type,
                },
                ...(options.realmId ? { realmId: options.realmId } : {}),
            });
        }

        // Compile EVENT_READ into a row condition (#3286 phase 3). Own rows are
        // always readable, so ownership composes as an OR-alternative — the whole
        // gate runs as WHERE (replacing the probe-based visibility derivation, and
        // additionally covering junction ATTRIBUTES policies the probe excluded)
        // and pagination/totals stay exact. A non-expressible policy falls back to
        // the probe + per-row loop below.
        const compiled = await actor.permissionEvaluator.compile({ name: PermissionName.EVENT_READ });
        if (compiled.verdict !== 'post') {
            const ownership = actor.identity ?
                and(eq('actorId', actor.identity.data.id), eq('actorType', actor.identity.type)) :
                null;

            let scoped = parsed;
            if (compiled.verdict === 'deny') {
                scoped = appendQueryConditions(parsed, ownership ?? inArray('id', []));
            } else if (compiled.verdict === 'conditional') {
                scoped = appendQueryConditions(
                    parsed,
                    ownership ? or(ownership, compiled.condition) : compiled.condition,
                );
            }

            return this.repository.findMany(scoped, { ...(options.realmId ? { realmId: options.realmId } : {}) });
        }

        const visibility = await this.resolveReadVisibility(actor);
        const { data: entities, meta } = await this.repository.findMany(parsed, {
            ...(options.realmId ? { realmId: options.realmId } : {}),
            ...(visibility ? { visibility } : {}),
        });

        const data: Event[] = [];

        for (const entity of entities) {
            if (this.isOwnedBy(entity, actor)) {
                data.push(entity);
                continue;
            }

            try {
                await actor.permissionEvaluator.evaluate({
                    name: PermissionName.EVENT_READ,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entity,
                        ...this.resourceRealmMatch(entity),
                    }),
                });
                data.push(entity);
            } catch {
                continue;
            }
        }

        return {
            data,
            meta: {
                ...meta,
                total: meta.total - (entities.length - data.length),
            },
        };
    }

    async getOne(id: string, actor: ActorContext, options: EventServiceReadOptions = {}): Promise<Event> {
        const entity = await this.repository.findOneById(id);
        if (!entity || (options.realmId && entity.realmId !== options.realmId)) {
            throw new EntityNotFoundError();
        }

        if (!this.isOwnedBy(entity, actor)) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.EVENT_READ });
            await actor.permissionEvaluator.evaluate({
                name: PermissionName.EVENT_READ,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: entity,
                    ...this.resourceRealmMatch(entity),
                }),
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
