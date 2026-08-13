/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SessionToken, SessionTokenKind } from '@authup/core-kit';
import type { IQuery } from '@rapiq/core';
import type { EntityRepositoryFindManyResult } from '@authup/server-kit';

export type SessionTokenCreateInput = {
    id: string,
    sessionId: string,
    /**
     * The client the token is issued for. Optional: a mint site that knows no
     * client (an MFA-login completion) persists null rather than guessing.
     */
    clientId?: string | null,
    kind: SessionTokenKind,
    parentId?: string | null,
    refreshTokenId?: string | null,
    ipAddress: string,
    userAgent: string,
    expiresAt: string,
};

export type SessionTokenRef = {
    id: string,
    expiresAt: string,
};

export interface ISessionTokenRepository {
    /**
     * Paginated inventory read.
     *
     * The `session` relation is joined unconditionally, because the caller's
     * authorization resolves through it: the rows carry no realm or subject of
     * their own. A `fields` projection must not be able to strip what the gate
     * reads (the plan-039 discipline, through a relation instead of a column).
     */
    findMany(query: IQuery): Promise<EntityRepositoryFindManyResult<SessionToken>>;

    /**
     * Load EVERY row matching a query, unbounded. A bulk revoke must reach
     * every match, so the schema's pagination cap is deliberately not applied
     * (same reasoning as `ISessionRepository.findAllByQuery`).
     */
    findAllByQuery(query: IQuery): Promise<SessionToken[]>;

    /**
     * Load one row by jti WITH its session joined.
     *
     * Separate from `findOneById` because authorization resolves through the
     * session: ownership and realm both live there, and a row without it fails
     * closed. Deliberately not expressed as a query, so the lookup cannot be
     * weakened by a decode that silently drops the predicate.
     */
    findOneWithSessionById(id: string): Promise<SessionToken | null>;

    /**
     * Persist a newly issued session-token row.
     *
     * Throws `SessionTokenSessionMissingError` when `sessionId` no longer names
     * a live session. The row is written after the caller resolved the session,
     * so a concurrent delete (a replay reaction, a logout, the sweeper) can land
     * in between and the write is then rejected. Callers that own an OAuth2
     * error vocabulary translate it; the rest let it settle as a plain
     * validation failure.
     */
    create(input: SessionTokenCreateInput): Promise<SessionToken>;

    /**
     * Find a session-token row by its id (= jti).
     */
    findOneById(id: string): Promise<SessionToken | null>;

    /**
     * Inventory query — every token bound to a session.
     */
    findBySessionId(sessionId: string): Promise<SessionToken[]>;

    /**
     * Atomically consume a refresh-token row. Resolves `true` only when this
     * call flipped a fresh (not consumed, not revoked) refresh row to consumed;
     * `false` on a replay / concurrent-refresh loser.
     *
     * @param id jti
     * @param at consumption timestamp (iso)
     */
    markRefreshConsumed(id: string, at: string): Promise<boolean>;

    /**
     * Whether any refresh-token row descended from `parentId` has itself been
     * consumed — i.e. the rotation chain has advanced past `parentId`. Used to
     * scope the grace window to the chain tip (a consumed descendant proves the
     * presented token is a stale ancestor, not a benign concurrent re-use).
     *
     * @param parentId jti of the presented refresh token
     */
    hasConsumedChild(parentId: string): Promise<boolean>;

    /**
     * Soft-revoke a single token row (e.g. explicit `/token/revoke`).
     *
     * @param id jti
     * @param at revocation timestamp (iso)
     */
    revokeById(id: string, at: string): Promise<void>;

    /**
     * Soft-revoke every token row of a session (family revoke). Returns the
     * affected rows' jti + expiry so the caller can blocklist each in cache
     * with a TTL pinned to the token's real lifetime.
     *
     * @param sessionId
     * @param at revocation timestamp (iso)
     */
    revokeBySessionId(sessionId: string, at: string): Promise<SessionTokenRef[]>;

    /**
     * Delete every token row whose `expiresAt` is before the given timestamp.
     *
     * @param before iso timestamp
     */
    deleteExpired(before: string): Promise<number>;
}
