/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum StoreDispatcherEventName {
    LOGGING_IN = 'loggingIn',
    LOGGED_IN = 'loggedIn',

    LOGGING_OUT = 'loggingOut',
    LOGGED_OUT = 'loggedOut',

    RESOLVING = 'resolving',
    RESOLVED = 'resolved',

    ACCESS_TOKEN_UPDATED = 'accessTokenUpdated',
    ACCESS_TOKEN_EXPIRE_DATE_UPDATED = 'accessTokenExpireDateUpdated',

    REFRESH_TOKEN_UPDATED = 'refreshTokenUpdated',

    USER_UPDATED = 'userUpdated',

    REALM_UPDATED = 'realmUpdated',
    REALM_MANAGEMENT_UPDATED = 'realmManagementUpdated',
}
