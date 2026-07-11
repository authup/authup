/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    Event, 
    EventName, 
    EventScope, 
    IdentityType,
} from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';

export type EventOwner = {
    actorId: string,
    actorType: string,
};

export type EventFindManyOptions = {
    /**
     * Mandatory owner constraint (self-service scope) — not overridable by a
     * rapiq filter.
     */
    owner?: EventOwner,
};

export type EventCountRecentFilter = {
    name: `${EventName}`,
    actorName?: string,
    requestIpAddress?: string,
    realmId?: string | null,
    /**
     * Window start (iso) — only rows created after this instant count.
     */
    since: string,
};

export interface IEventRepository {
    create(data: Partial<Event>): Event;

    save(entity: Event): Promise<Event>;

    findMany(
        query: Record<string, any>,
        options?: EventFindManyOptions,
    ): Promise<EntityRepositoryFindManyResult<Event>>;

    findOneById(id: string): Promise<Event | null>;

    countRecent(filter: EventCountRecentFilter): Promise<number>;

    /**
     * Retention sweep: drop every expiring row whose expires_at lies before
     * the given instant (non-expiring rows are kept forever). Returns the
     * number of removed rows.
     */
    deleteExpired(now: string): Promise<number>;
}

export type EventRecordInput = {
    scope: `${EventScope}`,
    name: `${EventName}`,
    refType?: string | null,
    refId?: string | null,
    clientId?: string | null,
    actorType?: `${IdentityType}` | null,
    actorId?: string | null,
    actorName?: string | null,
    requestPath?: string | null,
    requestMethod?: string | null,
    requestIpAddress?: string | null,
    requestUserAgent?: string | null,
    realmId?: string | null,
    data?: Record<string, any> | null,
};

export type EventServiceOptions = {
    /**
     * config.eventLogEnabled — when false, record() only emits the structured
     * log line and persists nothing.
     */
    enabled?: boolean,
    /**
     * config.eventLogRetentionDays — stamped per row as expiring/expires_at
     * at write time; 0 = keep forever (expiring stays false, expires_at null).
     */
    retentionDays?: number,
};

export interface IEventService {
    /**
     * Persist an audit event. Fire-and-forget-safe: never throws — a write
     * failure must not fail the originating auth operation.
     */
    record(input: EventRecordInput): Promise<void>;

    /**
     * List audit events. An actor without EVENT_READ is scoped to its own
     * rows ("my sign-in history"); an actor with EVENT_READ sees every row
     * its realm reach permits.
     */
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<Event>>;

    /**
     * Read a single audit event. Own rows need no permission.
     */
    getOne(id: string, actor: ActorContext): Promise<Event>;
}
