/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Client } from '../client';
import type { Session } from '../session';

export type SessionTokenKind = 'access' | 'refresh';

export interface SessionToken {
    /**
     * Token jti (application-populated, matches the JWT payload jti).
     */
    id: string;

    /**
     * Owning session.
     */
    sessionId: string;

    /**
     * The client the token was issued for. Attribution sits here rather than
     * on the session, because one browser session may serve several
     * applications.
     *
     * Null when the issuing path does not know the client (an MFA-login
     * completion rides a client-less session) and on rows created before the
     * column existed.
     */
    clientId: Client['id'] | null;

    /**
     * Token kind.
     */
    kind: SessionTokenKind;

    /**
     * Refresh tokens: previous refresh token in the rotation chain.
     * Informational — null on the initial refresh token and on access tokens.
     */
    parentId: string | null;

    /**
     * Access tokens: the refresh token this access token was issued alongside.
     * Informational — null on refresh tokens.
     */
    refreshTokenId: string | null;

    /**
     * IP address captured from the issuing request.
     */
    ipAddress: string;

    /**
     * User agent captured from the issuing request.
     */
    userAgent: string;

    /**
     * Refresh tokens: timestamp the token was consumed by a rotation (iso).
     * null on access tokens and on a not-yet-used refresh token.
     */
    consumedAt: string | null;

    /**
     * Timestamp the token was revoked (iso) — single-token revoke or family revoke.
     */
    revokedAt: string | null;

    /**
     * Expiration date (iso) — mirrors the JWT exp. Drives cleanup.
     */
    expiresAt: string;

    /**
     * Creation date (iso).
     */
    createdAt: string;

    // Relations. The rows carry no realm or subject of their own, so both
    // ownership and the realm gate resolve through `session`; the query schema
    // types its dotted filter keys off these.
    session?: Session;

    client?: Client | null;
}
