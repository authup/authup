/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * The store's event bus is a DERIVED layer over its state — every lifecycle
 * emission happens at a documented state transition, never as a parallel
 * source of truth. Emission semantics are frozen for backward compatibility
 * (plan 045): read the store's `status` / `lastAuthOrigin` state for new code.
 */
export enum StoreDispatcherEventName {
    /** @deprecated Read the store's `status` (=== 'authenticating') instead. */
    LOGGING_IN = 'loggingIn',
    /** @deprecated Read the store's `lastAuthOrigin` (=== 'login') / `status` instead. */
    LOGGED_IN = 'loggedIn',

    /** @deprecated Read the store's `status` instead. */
    LOGGING_OUT = 'loggingOut',
    /** @deprecated Read the store's `status` (=== 'unauthenticated') instead. */
    LOGGED_OUT = 'loggedOut',

    // Emitted when a background token refresh fails and the session is torn
    // down involuntarily (distinct from a user-initiated LOGGED_OUT, which
    // already drives its own navigation).
    SESSION_EXPIRED = 'sessionExpired',

    /** @deprecated Read the store's `status` instead. */
    RESOLVING = 'resolving',
    /**
     * @deprecated Read the store's `status` / `lastAuthOrigin` instead.
     * Still fires at the end of EVERY resolve() — including the unauthenticated
     * no-op — so it means "resolution settled", not "a session exists".
     */
    RESOLVED = 'resolved',

    ACCESS_TOKEN_UPDATED = 'accessTokenUpdated',
    ACCESS_TOKEN_EXPIRE_DATE_UPDATED = 'accessTokenExpireDateUpdated',

    REFRESH_TOKEN_UPDATED = 'refreshTokenUpdated',

    ID_TOKEN_UPDATED = 'idTokenUpdated',

    USER_UPDATED = 'userUpdated',

    REALM_UPDATED = 'realmUpdated',
    REALM_MANAGEMENT_UPDATED = 'realmManagementUpdated',
}
