/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AuditEvent, 
    AuditEventName, 
    AuditEventScope, 
    IdentityType,
} from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult } from '@authup/server-kit';

export type AuditEventOwner = {
    actorId: string,
    actorType: string,
};

export type AuditEventFindManyOptions = {
    /**
     * Mandatory owner constraint (self-service scope) — not overridable by a
     * rapiq filter.
     */
    owner?: AuditEventOwner,
};

export type AuditEventCountRecentFilter = {
    name: `${AuditEventName}`,
    actorName?: string,
    requestIpAddress?: string,
    realmId?: string | null,
    /**
     * Window start (iso) — only rows created after this instant count.
     */
    since: string,
};

export interface IAuditEventRepository {
    create(data: Partial<AuditEvent>): AuditEvent;

    save(entity: AuditEvent): Promise<AuditEvent>;

    findMany(
        query: Record<string, any>,
        options?: AuditEventFindManyOptions,
    ): Promise<EntityRepositoryFindManyResult<AuditEvent>>;

    findOneById(id: string): Promise<AuditEvent | null>;

    countRecent(filter: AuditEventCountRecentFilter): Promise<number>;

    /**
     * Retention sweep: drop every row whose expires_at lies before the given
     * instant (rows with expires_at = null are kept forever). Returns the
     * number of removed rows.
     */
    deleteExpired(now: string): Promise<number>;
}

export type AuditEventRecordInput = {
    scope: `${AuditEventScope}`,
    name: `${AuditEventName}`,
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

export type AuditEventServiceOptions = {
    /**
     * config.auditLogEnabled — when false, record() only emits the structured
     * log line and persists nothing.
     */
    enabled?: boolean,
    /**
     * config.auditLogRetentionDays — stamped per row as expires_at at write
     * time; 0 = keep forever (expires_at stays null).
     */
    retentionDays?: number,
};

export interface IAuditEventService {
    /**
     * Persist an audit event. Fire-and-forget-safe: never throws — a write
     * failure must not fail the originating auth operation.
     */
    record(input: AuditEventRecordInput): Promise<void>;

    /**
     * List audit events. An actor without AUDIT_READ is scoped to its own
     * rows ("my sign-in history"); an actor with AUDIT_READ sees every row
     * its realm reach permits.
     */
    getMany(query: Record<string, any>, actor: ActorContext): Promise<EntityRepositoryFindManyResult<AuditEvent>>;

    /**
     * Read a single audit event. Own rows need no permission.
     */
    getOne(id: string, actor: ActorContext): Promise<AuditEvent>;
}
