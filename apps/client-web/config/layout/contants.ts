/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NavigationItem } from '@vuecs/navigation';
import { PermissionName } from '@authup/core-kit';
import { 
    TranslatorTranslationActionKey, 
    TranslatorTranslationAppKey, 
    TranslatorTranslationEntityKey, 
    TranslatorTranslationNamespace, 
} from '@authup/i18n';
import type { NavigationItemMeta } from './types';

export enum LayoutKey {
    REQUIRED_LOGGED_IN = 'requireLoggedIn',
    REQUIRED_LOGGED_OUT = 'requireLoggedOut',

    REQUIRED_PERMISSIONS = 'requirePermissions',
}

export const LayoutTopNavigation : NavigationItem<NavigationItemMeta>[] = [
    {
        name: 'General',
        icon: 'fa6-solid:house',
        meta: { i18n: { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.GENERAL } },
    },
];

export const LayoutSideDefaultNavigation : NavigationItem<NavigationItemMeta>[] = [
    {
        name: 'Home',
        type: 'link',
        url: '/',
        icon: 'fa6-solid:house',
        meta: { i18n: { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.HOME } },
    },
    {
        name: 'Resources',
        type: 'separator',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.RESOURCES },
        },
    },
    {
        name: 'Realms',
        type: 'link',
        url: '/realms',
        icon: 'fa6-solid:building',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.REALM, 
                count: 2, 
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.REALM_READ,
                PermissionName.REALM_CREATE,
                PermissionName.REALM_UPDATE,
                PermissionName.REALM_DELETE,
            ],
        },
    },
    {
        name: 'Clients',
        type: 'link',
        url: '/clients',
        icon: 'fa6-solid:cube',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.CLIENT, 
                count: 2, 
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.CLIENT_READ,
                PermissionName.CLIENT_CREATE,
                PermissionName.CLIENT_UPDATE,
                PermissionName.CLIENT_DELETE,
            ],
        },
    },
    {
        name: 'Scopes',
        type: 'link',
        url: '/scopes',
        icon: 'fa6-solid:meteor',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.SCOPE, 
                count: 2, 
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.SCOPE_READ,
                PermissionName.SCOPE_CREATE,
                PermissionName.SCOPE_UPDATE,
                PermissionName.SCOPE_DELETE,
            ],
        },
    },
    {
        name: 'Identity Providers',
        type: 'link',
        url: '/identity-providers',
        icon: 'fa6-solid:atom',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.IDENTITY_PROVIDER, 
                count: 2, 
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.IDENTITY_PROVIDER_READ,
                PermissionName.IDENTITY_PROVIDER_CREATE,
                PermissionName.IDENTITY_PROVIDER_UPDATE,
                PermissionName.IDENTITY_PROVIDER_DELETE,
            ],
        },
    },
    {
        name: 'Robots',
        type: 'link',
        url: '/robots',
        icon: 'fa6-solid:robot',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.ROBOT, 
                count: 2, 
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.ROBOT_READ,
                PermissionName.ROBOT_CREATE,
                PermissionName.ROBOT_UPDATE,
                PermissionName.ROBOT_DELETE,
            ],
        },
    },
    {
        name: 'Users',
        type: 'link',
        url: '/users',
        icon: 'fa6-solid:user',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.USER, 
                count: 2, 
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.USER_READ,
                PermissionName.USER_CREATE,
                PermissionName.USER_UPDATE,
                PermissionName.USER_DELETE,
            ],
        },
    },
    {
        name: 'Roles',
        type: 'link',
        url: '/roles',
        icon: 'fa6-solid:masks-theater',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.ROLE, 
                count: 2, 
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_CREATE,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
                PermissionName.ROLE_PERMISSION_READ,
                PermissionName.ROLE_PERMISSION_CREATE,
                PermissionName.ROLE_PERMISSION_DELETE,
            ],
        },
    },
    {
        name: 'Policies',
        type: 'link',
        url: '/policies',
        icon: 'fa6-solid:scale-balanced',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.POLICY, 
                count: 2, 
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_CREATE,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        },
    },
    {
        name: 'Permissions',
        type: 'link',
        url: '/permissions',
        icon: 'fa6-solid:key',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY, 
                key: TranslatorTranslationEntityKey.PERMISSION, 
                count: 2, 
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_CREATE,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        },
    },
    {
        name: 'Events',
        type: 'link',
        url: '/events',
        icon: 'fa6-solid:clipboard-list',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: {
                namespace: TranslatorTranslationNamespace.ENTITY,
                key: TranslatorTranslationEntityKey.EVENT,
                count: 2,
            },
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.EVENT_READ,
            ],
        },
    },
    {
        name: 'Other',
        type: 'separator',
        meta: { i18n: { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.OTHER } },
    },
    {
        name: 'Login',
        type: 'link',
        url: '/login',
        icon: 'fa6-solid:right-to-bracket',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_OUT]: true,
            i18n: { namespace: TranslatorTranslationNamespace.ACTION, key: TranslatorTranslationActionKey.LOGIN },
        },
    },
    {
        name: 'Settings',
        type: 'link',
        url: '/settings',
        icon: 'fa6-solid:gear',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.SETTINGS },
        },
    },
    {
        name: 'Logout',
        type: 'link',
        url: '/logout',
        icon: 'fa6-solid:power-off',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            i18n: { namespace: TranslatorTranslationNamespace.APP, key: TranslatorTranslationAppKey.LOGOUT },
        },
    },
];
