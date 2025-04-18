/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NavigationItem } from '@vuecs/navigation';
import { PermissionName } from '@authup/core-kit';
import type { NavigationItemMeta } from './types';

export enum LayoutKey {
    REQUIRED_LOGGED_IN = 'requireLoggedIn',
    REQUIRED_LOGGED_OUT = 'requireLoggedOut',

    REQUIRED_PERMISSIONS = 'requirePermissions',
}

export const LayoutTopNavigation : NavigationItem<NavigationItemMeta>[] = [
    {
        name: 'General',
        icon: 'fa fa-home',
    },
];

export const LayoutSideDefaultNavigation : NavigationItem<NavigationItemMeta>[] = [
    {
        name: 'Home',
        type: 'link',
        url: '/',
        icon: 'fas fa-home',
    },
    {
        name: 'Resources',
        type: 'separator',
    },
    {
        name: 'Realms',
        type: 'link',
        url: '/realms',
        icon: 'fas fa-building',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
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
        icon: 'fa-solid fa-ghost',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
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
        icon: 'fa-solid fa-meteor',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
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
        icon: 'fa-solid fa-atom',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
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
        icon: 'fas fa-robot',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
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
        icon: 'fas fa-user',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
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
        icon: 'fa-solid fa-theater-masks',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
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
        icon: 'fa fa-balance-scale',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
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
        icon: 'fas fa-key',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
            [LayoutKey.REQUIRED_PERMISSIONS]: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_CREATE,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        },
    },
    {
        name: 'Other',
        type: 'separator',
    },
    {
        name: 'Login',
        type: 'link',
        url: '/login',
        icon: 'fas fa-sign',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_OUT]: true,
        },
    },
    {
        name: 'Settings',
        type: 'link',
        url: '/settings',
        icon: 'fas fa-cog',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        },
    },
    {
        name: 'Logout',
        type: 'link',
        url: '/logout',
        icon: 'fa fa-power-off',
        meta: {
            [LayoutKey.REQUIRED_LOGGED_IN]: true,
        },
    },
];
