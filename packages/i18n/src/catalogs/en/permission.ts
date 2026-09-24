/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { NamespaceTranslations } from '../../types';

export const TranslatorTranslationPermissionEnglish : NamespaceTranslations<`${PermissionName}`> = {
    [PermissionName.CLIENT_CREATE]: 'Create clients',
    [PermissionName.CLIENT_DELETE]: 'Delete clients',
    [PermissionName.CLIENT_UPDATE]: 'Update clients',
    [PermissionName.CLIENT_READ]: 'Read clients',
    [PermissionName.CLIENT_SELF_MANAGE]: 'Manage own client',

    [PermissionName.CLIENT_PERMISSION_CREATE]: 'Assign client permissions',
    [PermissionName.CLIENT_PERMISSION_DELETE]: 'Remove client permissions',
    [PermissionName.CLIENT_PERMISSION_READ]: 'Read client permissions',
    [PermissionName.CLIENT_PERMISSION_UPDATE]: 'Update client permissions',

    [PermissionName.CLIENT_ROLE_CREATE]: 'Assign client roles',
    [PermissionName.CLIENT_ROLE_DELETE]: 'Remove client roles',
    [PermissionName.CLIENT_ROLE_UPDATE]: 'Update client roles',
    [PermissionName.CLIENT_ROLE_READ]: 'Read client roles',

    [PermissionName.CLIENT_SCOPE_CREATE]: 'Assign client scopes',
    [PermissionName.CLIENT_SCOPE_DELETE]: 'Remove client scopes',
    [PermissionName.CLIENT_SCOPE_READ]: 'Read client scopes',

    [PermissionName.CONSENT_READ]: 'Read consents',
    [PermissionName.CONSENT_DELETE]: 'Delete consents',

    [PermissionName.EVENT_READ]: 'Read events',

    [PermissionName.IDENTITY_PROVIDER_CREATE]: 'Create identity providers',
    [PermissionName.IDENTITY_PROVIDER_DELETE]: 'Delete identity providers',
    [PermissionName.IDENTITY_PROVIDER_UPDATE]: 'Update identity providers',
    [PermissionName.IDENTITY_PROVIDER_READ]: 'Read identity providers',

    [PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ]: 'Read connected accounts',
    [PermissionName.IDENTITY_PROVIDER_ACCOUNT_DELETE]: 'Delete connected accounts',

    [PermissionName.IDENTITY_PROVIDER_ROLE_CREATE]: 'Assign identity provider role mappings',
    [PermissionName.IDENTITY_PROVIDER_ROLE_DELETE]: 'Remove identity provider role mappings',
    [PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE]: 'Update identity provider role mappings',
    [PermissionName.IDENTITY_PROVIDER_ROLE_READ]: 'Read identity provider role mappings',

    [PermissionName.KEY_CREATE]: 'Create keys',
    [PermissionName.KEY_DELETE]: 'Delete keys',
    [PermissionName.KEY_UPDATE]: 'Update keys',
    [PermissionName.KEY_READ]: 'Read keys',

    [PermissionName.PATH_CREATE]: 'Create paths',
    [PermissionName.PATH_DELETE]: 'Delete paths',
    [PermissionName.PATH_UPDATE]: 'Update paths',
    [PermissionName.PATH_READ]: 'Read paths',

    [PermissionName.PERMISSION_CREATE]: 'Create permissions',
    [PermissionName.PERMISSION_DELETE]: 'Delete permissions',
    [PermissionName.PERMISSION_UPDATE]: 'Update permissions',
    [PermissionName.PERMISSION_READ]: 'Read permissions',
    [PermissionName.PERMISSION_CHECK]: 'Check permissions of other identities',

    [PermissionName.REALM_CREATE]: 'Create realms',
    [PermissionName.REALM_DELETE]: 'Delete realms',
    [PermissionName.REALM_UPDATE]: 'Update realms',
    [PermissionName.REALM_READ]: 'Read realms',

    [PermissionName.ROLE_CREATE]: 'Create roles',
    [PermissionName.ROLE_DELETE]: 'Delete roles',
    [PermissionName.ROLE_UPDATE]: 'Update roles',
    [PermissionName.ROLE_READ]: 'Read roles',

    [PermissionName.ROLE_PERMISSION_CREATE]: 'Assign role permissions',
    [PermissionName.ROLE_PERMISSION_DELETE]: 'Remove role permissions',
    [PermissionName.ROLE_PERMISSION_READ]: 'Read role permissions',
    [PermissionName.ROLE_PERMISSION_UPDATE]: 'Update role permissions',

    [PermissionName.SCOPE_CREATE]: 'Create scopes',
    [PermissionName.SCOPE_DELETE]: 'Delete scopes',
    [PermissionName.SCOPE_UPDATE]: 'Update scopes',
    [PermissionName.SCOPE_READ]: 'Read scopes',

    [PermissionName.SESSION_READ]: 'Read sessions',
    [PermissionName.SESSION_DELETE]: 'Delete sessions',

    [PermissionName.TOKEN_INTROSPECT]: 'Introspect tokens',

    [PermissionName.USER_CREATE]: 'Create users',
    [PermissionName.USER_DELETE]: 'Delete users',
    [PermissionName.USER_UPDATE]: 'Update users',
    [PermissionName.USER_READ]: 'Read users',
    [PermissionName.USER_SELF_MANAGE]: 'Manage own account',

    [PermissionName.USER_AUTHENTICATOR_CREATE]: 'Create authenticators',
    [PermissionName.USER_AUTHENTICATOR_DELETE]: 'Delete authenticators',
    [PermissionName.USER_AUTHENTICATOR_UPDATE]: 'Update authenticators',
    [PermissionName.USER_AUTHENTICATOR_READ]: 'Read authenticators',

    [PermissionName.USER_PERMISSION_CREATE]: 'Assign user permissions',
    [PermissionName.USER_PERMISSION_DELETE]: 'Remove user permissions',
    [PermissionName.USER_PERMISSION_READ]: 'Read user permissions',
    [PermissionName.USER_PERMISSION_UPDATE]: 'Update user permissions',

    [PermissionName.USER_ROLE_CREATE]: 'Assign user roles',
    [PermissionName.USER_ROLE_DELETE]: 'Remove user roles',
    [PermissionName.USER_ROLE_UPDATE]: 'Update user roles',
    [PermissionName.USER_ROLE_READ]: 'Read user roles',
};
