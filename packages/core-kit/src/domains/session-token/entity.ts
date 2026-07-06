/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export type SessionTokenKind = 'access' | 'refresh';

export interface SessionToken {
    /**
     * Token jti (application-populated, matches the JWT payload jti).
     */
    id: string;

    /**
     * Owning session.
     */
    session_id: string;

    /**
     * Token kind.
     */
    kind: SessionTokenKind;

    /**
     * Refresh tokens: previous refresh token in the rotation chain.
     * Informational — null on the initial refresh token and on access tokens.
     */
    parent_id: string | null;

    /**
     * Access tokens: the refresh token this access token was issued alongside.
     * Informational — null on refresh tokens.
     */
    refresh_token_id: string | null;

    /**
     * IP address captured from the issuing request.
     */
    ip_address: string;

    /**
     * User agent captured from the issuing request.
     */
    user_agent: string;

    /**
     * Refresh tokens: timestamp the token was consumed by a rotation (iso).
     * null on access tokens and on a not-yet-used refresh token.
     */
    consumed_at: string | null;

    /**
     * Timestamp the token was revoked (iso) — single-token revoke or family revoke.
     */
    revoked_at: string | null;

    /**
     * Expiration date (iso) — mirrors the JWT exp. Drives cleanup.
     */
    expires_at: string;

    /**
     * Creation date (iso).
     */
    created_at: string;
}
