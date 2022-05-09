/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum CachePrefix {
    TOKEN_ACCESS = 'token_access',
    TOKEN_REFRESH = 'token_refresh',
    TOKEN_TARGET = 'token_target',
    TOKEN_TARGET_PERMISSIONS = 'token_target_permissions',

    USER = 'user',
    USER_OWNED_ATTRIBUTES = 'user_owned_attributes',
    USER_OWNED_PERMISSIONS = 'user_owned_permissions',
    USER_OWNED_ROLES = 'user_owned_roles',

    ROBOT = 'robot',
    ROBOT_OWNED_PERMISSIONS = 'robot_owned_permissions',
    ROBOT_OWNED_ROLES = 'robot_owned_roles',

    ROLE = 'role',
    ROLE_OWNED_PERMISSIONS = 'role_owned_permissions',
}
