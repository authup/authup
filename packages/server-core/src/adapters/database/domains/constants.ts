/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum CachePrefix {
    IDENTITY_PROVIDER = 'identity_provider',
    IDENTITY_PROVIDER_ACCOUNT = 'identity_provider_account',
    IDENTITY_PROVIDER_ATTRIBUTE = 'identity_provider_attribute',
    IDENTITY_PROVIDER_ROLE = 'identity_provider_role',

    OAUTH2_AUTHORIZATION_CODE = 'oauth2_authorization_code',

    CLIENT = 'client',
    CLIENT_OWNED_PERMISSIONS = 'client_owned_permissions',
    CLIENT_OWNED_ROLES = 'client_owned_roles',
    CLIENT_SCOPE = 'client_scope',

    USER = 'user',
    USER_OWNED_ATTRIBUTES = 'user_owned_attributes',
    USER_OWNED_PERMISSIONS = 'user_owned_permissions',
    USER_OWNED_ROLES = 'user_owned_roles',

    KEY = 'key',

    POLICY = 'policy',
    PERMISSION = 'permission',

    REALM = 'realm',

    POLICY_OWNED_ATTRIBUTES = 'policy_owned_attributes',

    ROBOT = 'robot',
    ROBOT_OWNED_PERMISSIONS = 'robot_owned_permissions',
    ROBOT_OWNED_ROLES = 'robot_owned_roles',

    ROLE = 'role',
    ROLE_OWNED_PERMISSIONS = 'role_owned_permissions',
}
