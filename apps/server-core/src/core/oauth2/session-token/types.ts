/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { SessionToken, SessionTokenKind } from '@authup/core-kit';

export type SessionTokenCreateInput = {
    id: string,
    session_id: string,
    kind: SessionTokenKind,
    parent_id?: string | null,
    refresh_token_id?: string | null,
    ip_address: string,
    user_agent: string,
    expires_at: string,
};

export type SessionTokenRef = {
    id: string,
    expires_at: string,
};

export interface ISessionTokenRepository {
    /**
     * Persist a newly issued session-token row.
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
     * Delete every token row whose `expires_at` is before the given timestamp.
     *
     * @param before iso timestamp
     */
    deleteExpired(before: string): Promise<number>;
}
