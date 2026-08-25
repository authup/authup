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
    TranslatorTranslationNamespace,
} from '@authup/i18n';
import type { LayoutSection } from './sections';
import { LayoutSections } from './sections';
import type { NavigationItemMeta } from './types';

export enum LayoutKey {
    REQUIRED_LOGGED_IN = 'requireLoggedIn',
    REQUIRED_LOGGED_OUT = 'requireLoggedOut',

    REQUIRED_PERMISSIONS = 'requirePermissions',
}

/**
 * Build a sidebar link for one entity section. Route, icon and label come from
 * the section descriptor, so the sidebar and the page breadcrumbs can never
 * disagree about them; only the access rules are declared per entry.
 */
function defineSectionNavigationItem(
    section: `${LayoutSection}`,
    meta: Omit<NavigationItemMeta, 'i18n'>,
) : NavigationItem<NavigationItemMeta> {
    const descriptor = LayoutSections[section];

    return {
        name: descriptor.name,
        type: 'link',
        url: descriptor.url,
        icon: descriptor.icon,
        meta: {
            ...meta,
            i18n: descriptor.i18n,
        },
    };
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
    defineSectionNavigationItem('realms', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.REALM_READ,
            PermissionName.REALM_CREATE,
            PermissionName.REALM_UPDATE,
            PermissionName.REALM_DELETE,
        ],
    }),
    defineSectionNavigationItem('clients', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.CLIENT_READ,
            PermissionName.CLIENT_CREATE,
            PermissionName.CLIENT_UPDATE,
            PermissionName.CLIENT_DELETE,
        ],
    }),
    defineSectionNavigationItem('scopes', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.SCOPE_READ,
            PermissionName.SCOPE_CREATE,
            PermissionName.SCOPE_UPDATE,
            PermissionName.SCOPE_DELETE,
        ],
    }),
    defineSectionNavigationItem('identity-providers', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.IDENTITY_PROVIDER_READ,
            PermissionName.IDENTITY_PROVIDER_CREATE,
            PermissionName.IDENTITY_PROVIDER_UPDATE,
            PermissionName.IDENTITY_PROVIDER_DELETE,
        ],
    }),
    defineSectionNavigationItem('keys', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.KEY_READ,
            PermissionName.KEY_CREATE,
            PermissionName.KEY_UPDATE,
            PermissionName.KEY_DELETE,
        ],
    }),
    defineSectionNavigationItem('trust-anchors', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.KEY_READ,
            PermissionName.KEY_CREATE,
            PermissionName.KEY_UPDATE,
            PermissionName.KEY_DELETE,
        ],
    }),
    defineSectionNavigationItem('users', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.USER_READ,
            PermissionName.USER_CREATE,
            PermissionName.USER_UPDATE,
            PermissionName.USER_DELETE,
        ],
    }),
    defineSectionNavigationItem('roles', {
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
    }),
    defineSectionNavigationItem('policies', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_CREATE,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ],
    }),
    defineSectionNavigationItem('permissions', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.PERMISSION_READ,
            PermissionName.PERMISSION_CREATE,
            PermissionName.PERMISSION_UPDATE,
            PermissionName.PERMISSION_DELETE,
        ],
    }),
    defineSectionNavigationItem('sessions', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.SESSION_READ,
        ],
    }),
    defineSectionNavigationItem('events', {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        [LayoutKey.REQUIRED_PERMISSIONS]: [
            PermissionName.EVENT_READ,
        ],
    }),
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
