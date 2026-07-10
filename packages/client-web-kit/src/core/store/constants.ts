/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export const STORE_ID = 'authup';

/**
 * The store's auth phase, derived from state PRESENCE
 * (token / realm / user) plus an in-flight interaction marker.
 *
 * AUTHENTICATED means token + realm + user are present; validating
 * them against the server remains resolve()'s job.
 */
export enum StoreAuthStatus {
    ANONYMOUS = 'anonymous',
    AUTHENTICATING = 'authenticating',
    RESTORING = 'restoring',
    AUTHENTICATED = 'authenticated',
}

/**
 * How the current session became authenticated in this app instance:
 * an interactive password login, an authorization-code exchange, or a
 * cookie restore validated by resolve(). App-instance-lifetime; null
 * while anonymous.
 */
export enum StoreAuthOrigin {
    LOGIN = 'login',
    EXCHANGE = 'exchange',
    RESTORE = 'restore',
}
