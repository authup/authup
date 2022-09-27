/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Component } from '@vue-layout/navigation';
import { PermissionID } from '@authelion/common';

export enum LayoutKey {
    NAVIGATION_ID = 'navigationId',
    REQUIRED_LOGGED_IN = 'requireLoggedIn',
    REQUIRED_LOGGED_OUT = 'requireLoggedOut',

    REQUIRED_PERMISSIONS = 'requirePermissions',
    REQUIRED_ABILITIES = 'requireAbilities',
}

export enum LayoutNavigationID {
    ADMIN = 'admin',
    DEFAULT = 'default',
}

export const LayoutTopNavigation : Component[] = [
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

export const LayoutSideDefaultNavigation : Component[] = [
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

export const LayoutSideAdminNavigation : Component[] = [
    {
        name: 'Realms',
        type: 'link',
        url: '/admin/realms',
        icon: 'fas fa-university',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionID.REALM_ADD,
            PermissionID.REALM_EDIT,
            PermissionID.REALM_DROP,
        ],
    },
    {
        name: 'Robots',
        type: 'link',
        url: '/admin/robots',
        icon: 'fas fa-robot',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionID.ROBOT_ADD,
            PermissionID.ROBOT_EDIT,
            PermissionID.ROBOT_DROP,
        ],
    },
    {
        name: 'Users',
        type: 'link',
        url: '/admin/users',
        icon: 'fas fa-user',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionID.USER_ADD,
            PermissionID.USER_EDIT,
            PermissionID.USER_DROP,
        ],
    },
    {
        name: 'Roles',
        type: 'link',
        url: '/admin/roles',
        icon: 'fa-solid fa-user-group',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionID.ROLE_ADD,
            PermissionID.ROLE_EDIT,
            PermissionID.ROLE_DROP,
            PermissionID.ROLE_PERMISSION_ADD,
            PermissionID.ROLE_PERMISSION_DROP,
        ],
    },
    {
        name: 'Permissions',
        type: 'link',
        url: '/admin/permissions',
        icon: 'fas fa-key',
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionID.PERMISSION_ADD,
            PermissionID.PERMISSION_EDIT,
            PermissionID.PERMISSION_DROP,
        ],
    },
];
