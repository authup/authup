/*
 * Copyright (c) 2021.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

/**
 * Relative realm reach of a permission grant (the `realm_scope` column). Mirrors the
 * `RealmScope` enum in `@authup/access` (the logic source of truth) — the values must
 * agree. Kept here as a plain const (no enum) since core-kit cannot depend on access.
 */
export type RealmScopeValue = 'none' | 'own' | 'ownOrNull' | 'any';

export const REALM_SCOPE = {
    NONE: 'none',
    OWN: 'own',
    OWN_OR_NULL: 'ownOrNull',
    ANY: 'any',
} as const satisfies Record<string, RealmScopeValue>;

export enum PermissionName {
    CLIENT_CREATE = 'client_create',
    CLIENT_DELETE = 'client_delete',
    CLIENT_UPDATE = 'client_update',
    CLIENT_READ = 'client_read',
    CLIENT_SELF_MANAGE = 'client_self_manage',

    CLIENT_PERMISSION_CREATE = 'client_permission_create',
    CLIENT_PERMISSION_DELETE = 'client_permission_delete',
    CLIENT_PERMISSION_READ = 'client_permission_read',
    CLIENT_PERMISSION_UPDATE = 'client_permission_update',

    CLIENT_ROLE_CREATE = 'client_role_create',
    CLIENT_ROLE_DELETE = 'client_role_delete',
    CLIENT_ROLE_UPDATE = 'client_role_update',
    CLIENT_ROLE_READ = 'client_role_read',

    CLIENT_SCOPE_CREATE = 'client_scope_create',
    CLIENT_SCOPE_DELETE = 'client_scope_delete',
    CLIENT_SCOPE_READ = 'client_scope_read',

    CONSENT_READ = 'consent_read',
    CONSENT_DELETE = 'consent_delete',

    EVENT_READ = 'event_read',

    IDENTITY_PROVIDER_CREATE = 'identity_provider_create',
    IDENTITY_PROVIDER_DELETE = 'identity_provider_delete',
    IDENTITY_PROVIDER_UPDATE = 'identity_provider_update',
    IDENTITY_PROVIDER_READ = 'identity_provider_read',

    IDENTITY_PROVIDER_ACCOUNT_READ = 'identity_provider_account_read',
    IDENTITY_PROVIDER_ACCOUNT_DELETE = 'identity_provider_account_delete',

    IDENTITY_PROVIDER_ROLE_CREATE = 'identity_provider_role_create',
    IDENTITY_PROVIDER_ROLE_DELETE = 'identity_provider_role_delete',
    IDENTITY_PROVIDER_ROLE_UPDATE = 'identity_provider_role_update',
    IDENTITY_PROVIDER_ROLE_READ = 'identity_provider_role_read',

    KEY_CREATE = 'key_create',
    KEY_DELETE = 'key_delete',
    KEY_UPDATE = 'key_update',
    KEY_READ = 'key_read',

    PERMISSION_CREATE = 'permission_create',
    PERMISSION_DELETE = 'permission_delete',
    PERMISSION_UPDATE = 'permission_update',
    PERMISSION_READ = 'permission_read',

    REALM_CREATE = 'realm_create',
    REALM_DELETE = 'realm_delete',
    REALM_UPDATE = 'realm_update',
    REALM_READ = 'realm_read',

    ROLE_CREATE = 'role_create',
    ROLE_DELETE = 'role_delete',
    ROLE_UPDATE = 'role_update',
    ROLE_READ = 'role_read',

    ROLE_PERMISSION_CREATE = 'role_permission_create',
    ROLE_PERMISSION_DELETE = 'role_permission_delete',
    ROLE_PERMISSION_READ = 'role_permission_read',
    ROLE_PERMISSION_UPDATE = 'role_permission_update',

    SCOPE_CREATE = 'scope_create',
    SCOPE_DELETE = 'scope_delete',
    SCOPE_UPDATE = 'scope_update',
    SCOPE_READ = 'scope_read',

    SESSION_READ = 'session_read',
    SESSION_DELETE = 'session_delete',

    USER_CREATE = 'user_create',
    USER_DELETE = 'user_delete',
    USER_UPDATE = 'user_update',
    USER_READ = 'user_read',
    USER_SELF_MANAGE = 'user_self_manage',

    USER_AUTHENTICATOR_CREATE = 'user_authenticator_create',
    USER_AUTHENTICATOR_DELETE = 'user_authenticator_delete',
    USER_AUTHENTICATOR_UPDATE = 'user_authenticator_update',
    USER_AUTHENTICATOR_READ = 'user_authenticator_read',

    USER_PERMISSION_CREATE = 'user_permission_create',
    USER_PERMISSION_DELETE = 'user_permission_delete',
    USER_PERMISSION_READ = 'user_permission_read',
    USER_PERMISSION_UPDATE = 'user_permission_update',

    USER_ROLE_CREATE = 'user_role_create',
    USER_ROLE_DELETE = 'user_role_delete',
    USER_ROLE_UPDATE = 'user_role_update',
    USER_ROLE_READ = 'user_role_read',
}
