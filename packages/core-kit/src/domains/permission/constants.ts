/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum PermissionName {
    CLIENT_CREATE = 'client_create',
    CLIENT_DELETE = 'client_delete',
    CLIENT_UPDATE = 'client_update',
    CLIENT_READ = 'client_read',
    CLIENT_SELF_MANAGE = 'client_self_manage',

    CLIENT_PERMISSION_CREATE = 'client_permission_create',
    CLIENT_PERMISSION_DELETE = 'client_permission_delete',
    CLIENT_PERMISSION_READ = 'client_permission_read',

    CLIENT_ROLE_CREATE = 'client_role_create',
    CLIENT_ROLE_DELETE = 'client_role_delete',
    CLIENT_ROLE_UPDATE = 'client_role_update',
    CLIENT_ROLE_READ = 'client_role_read',

    CLIENT_SCOPE_CREATE = 'client_scope_create',
    CLIENT_SCOPE_DELETE = 'client_scope_delete',

    IDENTITY_PROVIDER_CREATE = 'identity_provider_create',
    IDENTITY_PROVIDER_DELETE = 'identity_provider_delete',
    IDENTITY_PROVIDER_UPDATE = 'identity_provider_update',
    IDENTITY_PROVIDER_READ = 'identity_provider_read',

    IDENTITY_PROVIDER_ROLE_CREATE = 'identity_provider_role_create',
    IDENTITY_PROVIDER_ROLE_DELETE = 'identity_provider_role_delete',
    IDENTITY_PROVIDER_ROLE_UPDATE = 'identity_provider_role_update',

    PERMISSION_CREATE = 'permission_create',
    PERMISSION_DELETE = 'permission_delete',
    PERMISSION_UPDATE = 'permission_update',
    PERMISSION_READ = 'permission_read',

    REALM_CREATE = 'realm_create',
    REALM_DELETE = 'realm_delete',
    REALM_UPDATE = 'realm_update',
    REALM_READ = 'realm_read',

    ROBOT_CREATE = 'robot_create',
    ROBOT_DELETE = 'robot_delete',
    ROBOT_UPDATE = 'robot_update',
    ROBOT_READ = 'robot_read',
    ROBOT_SELF_MANAGE = 'robot_self_manage',

    ROBOT_PERMISSION_CREATE = 'robot_permission_create',
    ROBOT_PERMISSION_DELETE = 'robot_permission_delete',
    ROBOT_PERMISSION_READ = 'robot_permission_read',

    ROBOT_ROLE_CREATE = 'robot_role_create',
    ROBOT_ROLE_DELETE = 'robot_role_delete',
    ROBOT_ROLE_UPDATE = 'robot_role_update',
    ROBOT_ROLE_READ = 'robot_role_read',

    ROLE_CREATE = 'role_create',
    ROLE_DELETE = 'role_delete',
    ROLE_UPDATE = 'role_update',
    ROLE_READ = 'role_read',

    ROLE_PERMISSION_CREATE = 'role_permission_create',
    ROLE_PERMISSION_DELETE = 'role_permission_delete',
    ROLE_PERMISSION_READ = 'role_permission_read',

    SCOPE_CREATE = 'scope_create',
    SCOPE_DELETE = 'scope_delete',
    SCOPE_UPDATE = 'scope_update',
    SCOPE_READ = 'scope_read',

    USER_CREATE = 'user_create',
    USER_DELETE = 'user_delete',
    USER_UPDATE = 'user_update',
    USER_READ = 'user_read',
    USER_SELF_MANAGE = 'user_self_update',

    USER_PERMISSION_CREATE = 'user_permission_create',
    USER_PERMISSION_DELETE = 'user_permission_delete',
    USER_PERMISSION_READ = 'user_permission_read',

    USER_ROLE_CREATE = 'user_role_create',
    USER_ROLE_DELETE = 'user_role_delete',
    USER_ROLE_UPDATE = 'user_role_update',
    USER_ROLE_READ = 'user_role_read',
}
