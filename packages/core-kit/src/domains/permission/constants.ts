/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

export enum PermissionName {
    CLIENT_CREATE = 'client_add',
    CLIENT_DELETE = 'client_drop',
    CLIENT_UPDATE = 'client_edit',
    CLIENT_READ = 'client_read',

    IDENTITY_PROVIDER_CREATE = 'provider_add',
    IDENTITY_PROVIDER_DELETE = 'provider_drop',
    IDENTITY_PROVIDER_UPDATE = 'provider_edit',
    IDENTITY_PROVIDER_READ = 'identity_provider_read',

    PERMISSION_CREATE = 'permission_add',
    PERMISSION_DELETE = 'permission_drop',
    PERMISSION_UPDATE = 'permission_edit',
    PERMISSION_READ = 'permission_read',

    REALM_CREATE = 'realm_add',
    REALM_DELETE = 'realm_drop',
    REALM_UPDATE = 'realm_edit',
    REALM_READ = 'realm_read',

    ROBOT_CREATE = 'robot_add',
    ROBOT_DELETE = 'robot_drop',
    ROBOT_UPDATE = 'robot_edit',
    ROBOT_READ = 'robot_read',

    ROBOT_PERMISSION_CREATE = 'robot_permission_add',
    ROBOT_PERMISSION_DELETE = 'robot_permission_drop',
    ROBOT_PERMISSION_READ = 'robot_permission_read',

    ROBOT_ROLE_CREATE = 'robot_role_add',
    ROBOT_ROLE_DELETE = 'robot_role_drop',
    ROBOT_ROLE_UPDATE = 'robot_role_edit',
    ROBOT_ROLE_READ = 'robot_role_read',

    ROLE_CREATE = 'role_add',
    ROLE_DELETE = 'role_drop',
    ROLE_UPDATE = 'role_edit',
    ROLE_READ = 'role_read',

    ROLE_PERMISSION_CREATE = 'role_permission_add',
    ROLE_PERMISSION_DELETE = 'role_permission_drop',
    ROLE_PERMISSION_READ = 'role_permission_read',

    SCOPE_CREATE = 'scope_add',
    SCOPE_DELETE = 'scope_drop',
    SCOPE_UPDATE = 'scope_edit',
    SCOPE_READ = 'scope_read',

    USER_CREATE = 'user_add',
    USER_DELETE = 'user_drop',
    USER_UPDATE = 'user_edit',
    USER_READ = 'user_read',

    USER_PERMISSION_CREATE = 'user_permission_add',
    USER_PERMISSION_DELETE = 'user_permission_drop',
    USER_PERMISSION_READ = 'user_permission_read',

    USER_ROLE_CREATE = 'user_role_add',
    USER_ROLE_DELETE = 'user_role_drop',
    USER_ROLE_UPDATE = 'user_role_edit',
    USER_ROLE_READ = 'user_role_read',
}
