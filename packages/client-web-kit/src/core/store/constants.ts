/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const STORE_ID = 'authup';

/**
 * Path store cookies default to: the only one every surface on an origin is
 * guaranteed to read back. Narrow it per host via `cookiePath`.
 */
export const COOKIE_PATH = '/';

/**
 * The store's auth phase, derived from state PRESENCE
 * (access/refresh token / realm / user) plus an in-flight interaction
 * marker.
 *
 * AUTHENTICATED means token + realm + user are present; validating
 * them against the server remains resolve()'s job. UNAUTHENTICATED means
 * no session artifact at all — a refresh-token-only store (the
 * access-token cookie expired, the refresh-token session cookie
 * survived) reads RESTORING.
 *
 * RESTORING is presence-derived, not progress-derived: it does NOT imply
 * a restore is in flight — an RT-only store reads RESTORING until some
 * caller runs resolve() (which either completes the session or clears
 * the artifacts). Consumers rendering on status should await resolve()
 * rather than treating RESTORING as a transient spinner state.
 */
export enum StoreAuthStatus {
    UNAUTHENTICATED = 'unauthenticated',
    AUTHENTICATING = 'authenticating',
    RESTORING = 'restoring',
    AUTHENTICATED = 'authenticated',
}

/**
 * How the current session became authenticated in this app instance:
 * an interactive password login, an authorization-code exchange, or a
 * cookie restore validated by resolve(). Stamped at the END of the
 * settled interaction and cleared by cleanup() — it is NOT derived from
 * status: a raw-seeded store can read `authenticated` with a null
 * origin, and a stamped origin survives artifact expiry until the next
 * cleanup().
 */
export enum StoreAuthOrigin {
    LOGIN = 'login',
    EXCHANGE = 'exchange',
    RESTORE = 'restore',
}
