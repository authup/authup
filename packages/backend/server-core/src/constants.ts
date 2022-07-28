/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum CachePrefix {
    OAUTH2_AUTHORIZATION_CODE = 'oauth2_authorization_code',
    OAUTH2_ACCESS_TOKEN = 'oauth2_access_token',
    OAUTH2_REFRESH_TOKEN = 'oauth2_refresh_token',

    USER = 'user',
    USER_OWNED_ATTRIBUTES = 'user_owned_attributes',
    USER_OWNED_PERMISSIONS = 'user_owned_permissions',
    USER_OWNED_ROLES = 'user_owned_roles',

    KEY = 'key',

    ROBOT = 'robot',
    ROBOT_OWNED_PERMISSIONS = 'robot_owned_permissions',
    ROBOT_OWNED_ROLES = 'robot_owned_roles',

    ROLE = 'role',
    ROLE_OWNED_PERMISSIONS = 'role_owned_permissions',
}
