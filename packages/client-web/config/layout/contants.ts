/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { NavigationItem } from '@vuecs/navigation';
import { PermissionName } from '@authup/core-kit';

export enum LayoutKey {
    // todo: rename to NAVIGATION_TOP_ID
    NAVIGATION_ID = 'navigationTopId',
    NAVIGATION_SIDE_ID = 'navigationSideId',

    REQUIRED_LOGGED_IN = 'requireLoggedIn',
    REQUIRED_LOGGED_OUT = 'requireLoggedOut',

    REQUIRED_PERMISSIONS = 'requirePermissions',
}

export enum LayoutNavigationID {
    ADMIN = 'admin',
    DEFAULT = 'default',
}

export const LayoutTopNavigation : NavigationItem[] = [
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
        [LayoutKey.REQUIRED_PERMISSIONS]: [

        ],
    },
];

export const LayoutSideDefaultNavigation : NavigationItem[] = [
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

export const LayoutSideAdminNavigation : NavigationItem[] = [
    {
        name: 'Realms',
        type: 'link',
        url: '/admin/realms',
        icon: 'fas fa-building',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.REALM_READ,
            PermissionName.REALM_CREATE,
            PermissionName.REALM_UPDATE,
            PermissionName.REALM_DELETE,
        ],
    },
    {
        name: 'Clients',
        type: 'link',
        url: '/admin/clients',
        icon: 'fa-solid fa-ghost',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.CLIENT_READ,
            PermissionName.CLIENT_CREATE,
            PermissionName.CLIENT_UPDATE,
            PermissionName.CLIENT_DELETE,
        ],
    },
    {
        name: 'Scopes',
        type: 'link',
        url: '/admin/scopes',
        icon: 'fa-solid fa-meteor',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.SCOPE_READ,
            PermissionName.SCOPE_CREATE,
            PermissionName.SCOPE_UPDATE,
            PermissionName.SCOPE_DELETE,
        ],
    },
    {
        name: 'Identity Providers',
        type: 'link',
        url: '/admin/identity-providers',
        icon: 'fa-solid fa-atom',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.IDENTITY_PROVIDER_READ,
            PermissionName.IDENTITY_PROVIDER_CREATE,
            PermissionName.IDENTITY_PROVIDER_UPDATE,
            PermissionName.IDENTITY_PROVIDER_DELETE,
        ],
    },
    {
        name: 'Robots',
        type: 'link',
        url: '/admin/robots',
        icon: 'fas fa-robot',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.ROBOT_READ,
            PermissionName.ROBOT_CREATE,
            PermissionName.ROBOT_UPDATE,
            PermissionName.ROBOT_DELETE,
        ],
    },
    {
        name: 'Users',
        type: 'link',
        url: '/admin/users',
        icon: 'fas fa-user',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.USER_READ,
            PermissionName.USER_CREATE,
            PermissionName.USER_UPDATE,
            PermissionName.USER_DELETE,
        ],
    },
    {
        name: 'Roles',
        type: 'link',
        url: '/admin/roles',
        icon: 'fa-solid fa-theater-masks',
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
    {
        name: 'Permissions',
        type: 'link',
        url: '/admin/permissions',
        icon: 'fas fa-key',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_CREATE,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ],
    },
];
