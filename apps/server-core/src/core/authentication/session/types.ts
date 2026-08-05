/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Session } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';

export type SessionOwner = {
    sub: string,
    subKind: string,
};

/**
 * Filter keys a session query (list + bulk revoke) may target. Shared by the
 * repository's rapiq `filters.allowed` and the service's "is this a targeted
 * bulk revoke?" discriminator, so the two can never drift.
 */
export const SESSION_FILTER_KEYS = [
    'id',
    'sub',
    'subKind',
    'userId',
    'clientId',
    'realmId',
] as const;

export type SessionFindManyOptions = {
    /**
     * Force the result to a single subject (self-service). Applied as a
     * mandatory WHERE that a rapiq query filter cannot override.
     */
    owner?: SessionOwner,
    /**
     * Restrict to sessions that issued a token for one of these clients.
     * Applied as a mandatory WHERE alongside `owner`: the session's own
     * `client_id` (the client that first authorized on it) OR an EXISTS over
     * `auth_session_tokens`, which is where per-application attribution
     * actually lives. An empty array is treated as absent.
     */
    clientIds?: string[],
};

export interface ISessionRepository {
    findOneById(id: string): Promise<Session | null> | null;

    findMany(query: IQuery, options?: SessionFindManyOptions): Promise<EntityRepositoryFindManyResult<Session>>;

    findAllByOwner(owner: SessionOwner): Promise<Session[]>;

    /**
     * Load EVERY session matching a rapiq query filter — **unbounded** (no
     * pagination cap), because a bulk revoke must reach every match. Used by
     * the admin "force-logout" path; per-session authorization is enforced by
     * the caller (`SessionService`).
     */
    findAllByQuery(query: IQuery, options?: SessionFindManyOptions): Promise<Session[]>;

    save(session: Partial<Session>): Promise<Session>;

    removeById(id: string): Promise<void>;

    remove(session: Session) : Promise<void>;
}

export type SessionManagerOptions = {
    /**
     * Max age in seconds (sec).
     */
    maxAge: number
};

export type SessionManagerContext = {
    options: SessionManagerOptions,
    repository: ISessionRepository,
};

export interface ISessionManager {
    /**
     * Create new session.
     *
     * @param session
     */
    create(session: Partial<Session>): Promise<Session>;

    /**
     * Updates seenAt with current time.
     *
     * @param session
     */
    ping(session: Session) : Promise<Session>;

    /**
     * Updates refreshedAt, seenAt with current time.
     *
     * @param session
     */
    refresh(session: Session) : Promise<Session>;

    /**
     * Stamp a successful second-factor challenge (mfaAt) onto the session.
     *
     * @param session
     */
    markMfaVerified(session: Session) : Promise<Session>;

    /**
     * Check if session exists and is valid.
     *
     * @throws JWTError
     * @param session
     */
    verify(session: Session): Promise<void>;

    /**
     * Find session by id.
     *
     * @param id
     */
    findOneById(id: string): Promise<Session | null>;

    /**
     * Revoke (delete) a session by id, forcing re-authentication. Idempotent —
     * a no-op when the session does not exist.
     *
     * @param id
     */
    revoke(id: string): Promise<void>;
}
