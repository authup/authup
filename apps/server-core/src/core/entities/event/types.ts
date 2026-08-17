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
import type { IQuery } from '@rapiq/core';

export type EventOwner = {
    actorId: string,
    actorType: string,
};

export type EventReadVisibility = {
    owner?: EventOwner,
    realmIds: Array<string | null>,
};

export type EventFindManyOptions = {
    /**
     * Mandatory owner constraint (self-service scope) — not overridable by a
     * rapiq filter.
     */
    owner?: EventOwner,
    realmId?: string,
    /**
     * Rows reachable through the actor's realm-scoped permission, plus the
     * actor's own rows. Applied before pagination so meta.total cannot include
     * events outside that reach.
     */
    visibility?: EventReadVisibility,
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
        query: IQuery,
        options?: EventFindManyOptions,
    ): Promise<EntityRepositoryFindManyResult<Event>>;

    findOneById(id: string): Promise<Event | null>;

    countRecent(filter: EventCountRecentFilter): Promise<number>;

    /**
     * Retention sweep: drop every expiring row whose expiresAt lies before
     * the given instant (non-expiring rows are kept forever). Returns the
     * number of removed rows. Removal is batched (see
     * EVENT_RETENTION_SWEEP_BATCH_SIZE).
     */
    deleteExpired(now: string, options?: EventDeleteExpiredOptions): Promise<number>;
}

export type EventDeleteExpiredOptions = {
    /**
     * Rows removed per statement. Defaults to
     * EVENT_RETENTION_SWEEP_BATCH_SIZE.
     */
    batchSize?: number,
};

export type EventRecordInput = {
    scope: `${EventScope}`,
    name: `${EventName}`,
    refType?: string | null,
    refId?: string | null,
    clientId?: string | null,
    sessionId?: string | null,
    actorType?: `${IdentityType}` | null,
    actorId?: string | null,
    actorName?: string | null,
    requestPath?: string | null,
    requestMethod?: string | null,
    requestIpAddress?: string | null,
    requestUserAgent?: string | null,
    realmId?: string | null,
    data?: Record<string, any> | null,
    /**
     * Per-event retention override in days — wins over the service-level
     * retentionDays; 0 = keep forever. expiring/expiresAt derive from the
     * effective value.
     */
    retentionDays?: number,
};

export type EventServiceOptions = {
    /**
     * config.eventLogEnabled — when false, record() only emits the structured
     * log line and persists nothing.
     */
    enabled?: boolean,
    /**
     * config.eventLogRetentionDays — stamped per row as expiring/expiresAt
     * at write time; 0 = keep forever (expiring stays false, expiresAt null).
     */
    retentionDays?: number,
};

export type EventServiceReadOptions = {
    realmId?: string,
};

/**
 * Actor + request attribution for entity-CRUD audit rows. The shape is
 * defined here (core) so core never imports from adapters/http — the wiring
 * injects the HTTP adapter's AsyncLocalStorage getter, and writes outside an
 * HTTP request (provisioning, CLI, cron) simply resolve to undefined.
 */
export type EventRequestContext = {
    actorType: `${IdentityType}` | null,
    actorId: string | null,
    actorName: string | null,
    sessionId: string | null,
    requestPath: string | null,
    requestMethod: string | null,
    requestIpAddress: string | null,
    requestUserAgent: string | null,
};

export type EntityEventHandlerOptions = {
    /**
     * Per-row retention (days) for entity-CRUD audit rows — entity churn
     * self-prunes on a short TTL (config eventLogEntityRetentionDays).
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
    getMany(
        query: Record<string, any>,
        actor: ActorContext,
        options?: EventServiceReadOptions,
    ): Promise<EntityRepositoryFindManyResult<Event>>;

    /**
     * Read a single audit event. Own rows need no permission.
     */
    getOne(id: string, actor: ActorContext, options?: EventServiceReadOptions): Promise<Event>;
}
