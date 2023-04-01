/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NavigationElement } from '@vue-layout/basic';
import { PermissionName } from '@authup/common';

export enum LayoutKey {
    NAVIGATION_ID = 'navigationId',
    REQUIRED_LOGGED_IN = 'requireLoggedIn',
    REQUIRED_LOGGED_OUT = 'requireLoggedOut',

    REQUIRED_PERMISSIONS = 'requirePermissions',
}

export enum LayoutNavigationID {
    ADMIN = 'admin',
    DEFAULT = 'default',
}

export const LayoutTopNavigation : NavigationElement[] = [
    {
        id: LayoutNavigationID.DEFAULT,
        name: 'General',
        icon: 'fa fa-home',
    },
    {
        id: LayoutNavigationID.ADMIN,
        name: 'Admin',
        icon: 'fas fa-cog',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [],
    },
];

export const LayoutSideDefaultNavigation : NavigationElement[] = [
    {
        name: 'General',
        type: 'separator',
    },
    {
        name: 'Home',
        type: 'link',
        url: '/',
        icon: 'fas fa-home',
        rootLink: true,
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
        [LayoutKey.REQUIRED_LOGGED_OUT]: true,
    },
    {
        name: 'Settings',
        type: 'link',
        url: '/settings',
        icon: 'fas fa-cog',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
    },
    {
        name: 'Logout',
        type: 'link',
        url: '/logout',
        icon: 'fa fa-power-off',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
    },
];

export const LayoutSideAdminNavigation : NavigationElement[] = [
    {
        name: 'Realms',
        type: 'link',
        url: '/admin/realms',
        icon: 'fas fa-university',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.REALM_ADD,
            PermissionName.REALM_EDIT,
            PermissionName.REALM_DROP,
        ],
    },
    {
        name: 'Clients',
        type: 'link',
        url: '/admin/clients',
        icon: 'fa-solid fa-ghost',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.CLIENT_ADD,
            PermissionName.CLIENT_EDIT,
            PermissionName.CLIENT_DROP,
        ],
    },
    {
        name: 'Scopes',
        type: 'link',
        url: '/admin/scopes',
        icon: 'fa-solid fa-meteor',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.SCOPE_ADD,
            PermissionName.SCOPE_EDIT,
            PermissionName.SCOPE_DROP,
        ],
    },
    {
        name: 'Identity Providers',
        type: 'link',
        url: '/admin/identity-providers',
        icon: 'fa-solid fa-atom',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.PROVIDER_ADD,
            PermissionName.PROVIDER_EDIT,
            PermissionName.PROVIDER_DROP,
        ],
    },
    {
        name: 'Robots',
        type: 'link',
        url: '/admin/robots',
        icon: 'fas fa-robot',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.ROBOT_ADD,
            PermissionName.ROBOT_EDIT,
            PermissionName.ROBOT_DROP,
        ],
    },
    {
        name: 'Users',
        type: 'link',
        url: '/admin/users',
        icon: 'fas fa-user',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.USER_ADD,
            PermissionName.USER_EDIT,
            PermissionName.USER_DROP,
        ],
    },
    {
        name: 'Roles',
        type: 'link',
        url: '/admin/roles',
        icon: 'fa-solid fa-user-group',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.ROLE_ADD,
            PermissionName.ROLE_EDIT,
            PermissionName.ROLE_DROP,
            PermissionName.ROLE_PERMISSION_ADD,
            PermissionName.ROLE_PERMISSION_DROP,
        ],
    },
    {
        name: 'Permissions',
        type: 'link',
        url: '/admin/permissions',
        icon: 'fas fa-key',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.PERMISSION_ADD,
            PermissionName.PERMISSION_EDIT,
            PermissionName.PERMISSION_DROP,
        ],
    },
];
