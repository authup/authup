/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { randomUUID } from 'node:crypto';
import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import { PermissionName } from '@authup/core-kit';
import type { Event } from '@authup/core-kit';
import { EntityNotFoundError } from '@authup/errors';
import { AbstractEntityService } from '@authup/server-kit';
import type { ActorContext, EntityRepositoryFindManyResult, Logger } from '@authup/server-kit';
import { sanitizeEventData } from './sanitize.ts';
import type {
    EventRecordInput,
    EventServiceOptions,
    EventServiceReadOptions,
    IEventRepository,
    IEventService,
} from './types.ts';

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
            !!entity.actor_id &&
            entity.actor_id === actor.identity.data.id &&
            entity.actor_type === actor.identity.type;
    }

    async record(input: EventRecordInput): Promise<void> {
        const data = sanitizeEventData(input.data);

        // complementary structured log line — fires even when persistence is
        // disabled, so a SIEM/Loki pipeline can pick the events up for free.
        this.logger?.info(`audit: ${input.scope}.${input.name}`, {
            scope: input.scope,
            name: input.name,
            ref_type: input.refType ?? null,
            ref_id: input.refId ?? null,
            client_id: input.clientId ?? null,
            actor_type: input.actorType ?? null,
            actor_id: input.actorId ?? null,
            realm_id: input.realmId ?? null,
            ...(data ? { data } : {}),
        });

        if (this.options.enabled === false) {
            return;
        }

        try {
            const retentionDays = input.retentionDays ?? this.options.retentionDays ?? 365;

            const entity = this.repository.create({
                id: randomUUID(),
                scope: input.scope,
                name: input.name,
                ref_type: truncate(input.refType, 64),
                ref_id: truncate(input.refId, 64),
                client_id: input.clientId ?? null,
                actor_type: input.actorType ?? null,
                actor_id: input.actorId ?? null,
                actor_name: truncate(input.actorName, 128),
                request_path: truncate(input.requestPath, 256),
                request_method: truncate(input.requestMethod, 10),
                request_ip_address: truncate(input.requestIpAddress, 45),
                request_user_agent: truncate(input.requestUserAgent, 512),
                realm_id: input.realmId ?? null,
                data,
                expiring: retentionDays > 0,
                expires_at: retentionDays > 0 ?
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
            return this.repository.findMany(query, {
                owner: {
                    actorId: actor.identity!.data.id,
                    actorType: actor.identity!.type,
                },
                ...(options.realmId ? { realmId: options.realmId } : {}),
            });
        }

        const { data: entities, meta } = await this.repository.findMany(
            query,
            options.realmId ? { realmId: options.realmId } : undefined,
        );

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
                total: data.length,
            },
        };
    }

    async getOne(id: string, actor: ActorContext, options: EventServiceReadOptions = {}): Promise<Event> {
        const entity = await this.repository.findOneById(id);
        if (!entity || (options.realmId && entity.realm_id !== options.realmId)) {
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
