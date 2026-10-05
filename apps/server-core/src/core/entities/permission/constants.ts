/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';

/**
 * Permissions the realm_admin role never holds.
 */
export const REALM_ADMIN_EXCLUDED_PERMISSIONS : string[] = [
    PermissionName.REALM_CREATE,
    PermissionName.REALM_UPDATE,
    PermissionName.REALM_DELETE,
];

/**
 * Permissions realm_admin holds at `realmScope: own`, strictly its own realm.
 * Every other realm_admin permission is held at `ownOrNull`, so it can read
 * and assign global building blocks. Read by the default provisioning source
 * and by the permission service, which binds a permission created at runtime.
 */
export const REALM_ADMIN_OWN_REACH_PERMISSIONS : string[] = [
    PermissionName.CLIENT_CREATE,
    PermissionName.CLIENT_UPDATE,
    PermissionName.CLIENT_DELETE,
    PermissionName.CONSENT_DELETE,
    PermissionName.IDENTITY_PROVIDER_CREATE,
    PermissionName.IDENTITY_PROVIDER_UPDATE,
    PermissionName.IDENTITY_PROVIDER_DELETE,
    PermissionName.IDENTITY_PROVIDER_ACCOUNT_DELETE,
    PermissionName.KEY_CREATE,
    PermissionName.KEY_UPDATE,
    PermissionName.KEY_DELETE,
    PermissionName.PATH_CREATE,
    PermissionName.PATH_UPDATE,
    PermissionName.PATH_DELETE,
    PermissionName.PERMISSION_CREATE,
    PermissionName.PERMISSION_UPDATE,
    PermissionName.PERMISSION_DELETE,
    PermissionName.ROLE_CREATE,
    PermissionName.ROLE_UPDATE,
    PermissionName.ROLE_DELETE,
    PermissionName.ROLE_PERMISSION_CREATE,
    PermissionName.ROLE_PERMISSION_UPDATE,
    PermissionName.ROLE_PERMISSION_DELETE,
    PermissionName.SCOPE_CREATE,
    PermissionName.SCOPE_UPDATE,
    PermissionName.SCOPE_DELETE,
    PermissionName.SESSION_DELETE,
    PermissionName.USER_CREATE,
    PermissionName.USER_UPDATE,
    PermissionName.USER_DELETE,
    PermissionName.USER_AUTHENTICATOR_CREATE,
    PermissionName.USER_AUTHENTICATOR_UPDATE,
    PermissionName.USER_AUTHENTICATOR_DELETE,
];
