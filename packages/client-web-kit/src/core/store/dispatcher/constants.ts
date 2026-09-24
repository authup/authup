/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Events the store emits when a token or realm ref changes, which the cookie
 * persistence and the http client's authentication hook follow, plus the
 * involuntary expiry signal. Session lifecycle is read from the store's
 * `status` / `lastAuthOrigin` state, never from an event.
 */
export enum StoreDispatcherEventName {
    // Emitted when a background token refresh fails and the session is torn
    // down involuntarily (a user-initiated logout drives its own navigation).
    SESSION_EXPIRED = 'sessionExpired',

    ACCESS_TOKEN_UPDATED = 'accessTokenUpdated',
    ACCESS_TOKEN_EXPIRE_DATE_UPDATED = 'accessTokenExpireDateUpdated',

    REFRESH_TOKEN_UPDATED = 'refreshTokenUpdated',

    ID_TOKEN_UPDATED = 'idTokenUpdated',

    USER_UPDATED = 'userUpdated',

    REALM_MANAGEMENT_UPDATED = 'realmManagementUpdated',
}
