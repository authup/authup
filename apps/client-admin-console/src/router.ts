/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionName } from '@authup/core-kit';
import type { RouteRecordRaw, Router } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
import { LayoutKey } from './config/layout';

declare module 'vue-router' {
    interface RouteMeta {
        [LayoutKey.REQUIRED_LOGGED_IN]?: boolean,
        [LayoutKey.REQUIRED_LOGGED_OUT]?: boolean,
        [LayoutKey.REQUIRED_PERMISSIONS]?: string[],
        layout?: 'default' | 'auth',
    }
}

/**
 * Logged-in page, optionally gated on ANY of the given permissions (the
 * guard evaluates `preEvaluateOneOf`).
 */
function auth(permissions?: `${PermissionName}`[]) {
    return {
        [LayoutKey.REQUIRED_LOGGED_IN]: true,
        ...(permissions ? { [LayoutKey.REQUIRED_PERMISSIONS]: permissions } : {}),
    };
}

/** The four CRUD permissions of an entity family. */
function crud(entity: string) : `${PermissionName}`[] {
    return [
        `${entity}_read`,
        `${entity}_update`,
        `${entity}_delete`,
        `${entity}_create`,
    ] as `${PermissionName}`[];
}

/**
 * The route table, one entry per file of the former Nuxt `pages/` tree
 * (which is kept as-is under src/pages): `<section>/index.vue` frames the
 * collection routes (overview + add), `<section>/[id].vue` frames the record
 * routes (general + the relation tabs). Every page is a lazy import, so
 * each keeps its own chunk.
 */
export const routes : RouteRecordRaw[] = [
    {
        path: '/',
        component: () => import('./pages/index.vue'),
        meta: auth(),
    },
    {
        path: '/login',
        component: () => import('./pages/login/index.vue'),
        meta: { [LayoutKey.REQUIRED_LOGGED_OUT]: true, layout: 'auth' },
    },
    {
        path: '/login/callback',
        component: () => import('./pages/login/callback.vue'),
        meta: { ...auth(), layout: 'auth' },
    },
    {
        path: '/logout',
        component: () => import('./pages/logout.vue'),
        meta: { layout: 'auth' },
    },
    {
        path: '/settings/:path(.*)*',
        component: () => import('./pages/settings/[[...path]].vue'),
        meta: auth(),
    },

    // ------------------------------------------------------------

    {
        path: '/clients',
        component: () => import('./pages/clients/index.vue'),
        meta: auth(crud('client')),
        children: [
            { path: '', component: () => import('./pages/clients/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/clients/index/add.vue'),
                meta: auth([PermissionName.CLIENT_CREATE]),
            },
        ],
    },
    {
        path: '/clients/:id',
        component: () => import('./pages/clients/[id].vue'),
        meta: auth([PermissionName.CLIENT_UPDATE]),
        children: [
            { path: '', component: () => import('./pages/clients/[id]/index.vue') },
            { path: 'permissions', component: () => import('./pages/clients/[id]/permissions.vue') },
            { path: 'roles', component: () => import('./pages/clients/[id]/roles.vue') },
            { path: 'scopes', component: () => import('./pages/clients/[id]/scopes.vue') },
            { path: 'url', component: () => import('./pages/clients/[id]/url.vue') },
        ],
    },

    {
        path: '/events',
        component: () => import('./pages/events/index.vue'),
        meta: auth([PermissionName.EVENT_READ]),
        children: [
            { path: '', component: () => import('./pages/events/index/index.vue') },
        ],
    },
    {
        path: '/events/:id',
        component: () => import('./pages/events/[id]/index.vue'),
        meta: auth([PermissionName.EVENT_READ]),
    },

    {
        path: '/identity-providers',
        component: () => import('./pages/identity-providers/index.vue'),
        meta: auth(crud('identity_provider')),
        children: [
            { path: '', component: () => import('./pages/identity-providers/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/identity-providers/index/add.vue'),
                meta: auth([PermissionName.IDENTITY_PROVIDER_CREATE]),
            },
        ],
    },
    {
        path: '/identity-providers/:id',
        component: () => import('./pages/identity-providers/[id].vue'),
        meta: auth([PermissionName.IDENTITY_PROVIDER_UPDATE]),
        children: [
            { path: '', component: () => import('./pages/identity-providers/[id]/index.vue') },
            { path: 'roles', component: () => import('./pages/identity-providers/[id]/roles.vue') },
        ],
    },

    {
        path: '/keys',
        component: () => import('./pages/keys/index.vue'),
        meta: auth(crud('key')),
        children: [
            { path: '', component: () => import('./pages/keys/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/keys/index/add.vue'),
                meta: auth([PermissionName.KEY_CREATE]),
            },
        ],
    },
    {
        path: '/keys/:id',
        component: () => import('./pages/keys/[id].vue'),
        meta: auth([PermissionName.KEY_UPDATE]),
        children: [
            { path: '', component: () => import('./pages/keys/[id]/index.vue') },
        ],
    },

    {
        path: '/permissions',
        component: () => import('./pages/permissions/index.vue'),
        meta: auth(crud('permission')),
        children: [
            { path: '', component: () => import('./pages/permissions/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/permissions/index/add.vue'),
                meta: auth([PermissionName.PERMISSION_CREATE]),
            },
        ],
    },
    {
        path: '/permissions/:id',
        component: () => import('./pages/permissions/[id].vue'),
        meta: auth([PermissionName.PERMISSION_UPDATE]),
        children: [
            { path: '', component: () => import('./pages/permissions/[id]/index.vue') },
            { path: 'clients', component: () => import('./pages/permissions/[id]/clients.vue') },
            { path: 'policies', component: () => import('./pages/permissions/[id]/policies.vue') },
            { path: 'roles', component: () => import('./pages/permissions/[id]/roles.vue') },
            { path: 'users', component: () => import('./pages/permissions/[id]/users.vue') },
        ],
    },

    {
        path: '/policies',
        component: () => import('./pages/policies/index.vue'),
        meta: auth(crud('permission')),
        children: [
            { path: '', component: () => import('./pages/policies/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/policies/index/add.vue'),
                meta: auth([PermissionName.PERMISSION_CREATE]),
            },
        ],
    },
    {
        path: '/policies/:id',
        component: () => import('./pages/policies/[id].vue'),
        meta: auth([PermissionName.PERMISSION_UPDATE]),
        children: [
            { path: '', component: () => import('./pages/policies/[id]/index.vue') },
        ],
    },

    {
        path: '/realms',
        component: () => import('./pages/realms/index.vue'),
        meta: auth(crud('realm')),
        children: [
            { path: '', component: () => import('./pages/realms/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/realms/index/add.vue'),
                meta: auth([PermissionName.REALM_CREATE]),
            },
        ],
    },
    {
        path: '/realms/:id',
        component: () => import('./pages/realms/[id].vue'),
        meta: auth([PermissionName.REALM_UPDATE]),
        children: [
            { path: '', component: () => import('./pages/realms/[id]/index.vue') },
        ],
    },

    {
        path: '/roles',
        component: () => import('./pages/roles/index.vue'),
        meta: auth(crud('role')),
        children: [
            { path: '', component: () => import('./pages/roles/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/roles/index/add.vue'),
                meta: auth([PermissionName.ROLE_CREATE]),
            },
        ],
    },
    {
        path: '/roles/:id',
        component: () => import('./pages/roles/[id].vue'),
        meta: auth([
            PermissionName.ROLE_UPDATE,
            PermissionName.USER_ROLE_CREATE,
            PermissionName.USER_ROLE_UPDATE,
            PermissionName.USER_ROLE_DELETE,
        ]),
        children: [
            { path: '', component: () => import('./pages/roles/[id]/index.vue') },
            { path: 'clients', component: () => import('./pages/roles/[id]/clients.vue') },
            { path: 'permissions', component: () => import('./pages/roles/[id]/permissions.vue') },
            { path: 'users', component: () => import('./pages/roles/[id]/users.vue') },
        ],
    },

    {
        path: '/scopes',
        component: () => import('./pages/scopes/index.vue'),
        meta: auth(crud('scope')),
        children: [
            { path: '', component: () => import('./pages/scopes/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/scopes/index/add.vue'),
                meta: auth([PermissionName.SCOPE_CREATE]),
            },
        ],
    },
    {
        path: '/scopes/:id',
        component: () => import('./pages/scopes/[id].vue'),
        meta: auth([PermissionName.SCOPE_UPDATE]),
        children: [
            { path: '', component: () => import('./pages/scopes/[id]/index.vue') },
            { path: 'clients', component: () => import('./pages/scopes/[id]/clients.vue') },
        ],
    },

    {
        path: '/sessions',
        component: () => import('./pages/sessions/index.vue'),
        meta: auth([PermissionName.SESSION_READ]),
        children: [
            { path: '', component: () => import('./pages/sessions/index/index.vue') },
        ],
    },
    {
        path: '/sessions/:id',
        component: () => import('./pages/sessions/[id]/index.vue'),
        meta: auth([PermissionName.SESSION_READ]),
    },

    {
        path: '/trust-anchors',
        component: () => import('./pages/trust-anchors/index.vue'),
        meta: auth(crud('key')),
        children: [
            { path: '', component: () => import('./pages/trust-anchors/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/trust-anchors/index/add.vue'),
                meta: auth([PermissionName.KEY_CREATE]),
            },
        ],
    },
    {
        path: '/trust-anchors/:id',
        component: () => import('./pages/trust-anchors/[id].vue'),
        meta: auth([PermissionName.KEY_UPDATE]),
    },

    {
        path: '/users',
        component: () => import('./pages/users/index.vue'),
        meta: auth(crud('user')),
        children: [
            { path: '', component: () => import('./pages/users/index/index.vue') },
            {
                path: 'add',
                component: () => import('./pages/users/index/add.vue'),
                meta: auth([PermissionName.USER_CREATE]),
            },
        ],
    },
    {
        path: '/users/:id',
        component: () => import('./pages/users/[id].vue'),
        meta: auth([
            PermissionName.USER_UPDATE,
            PermissionName.USER_ROLE_CREATE,
            PermissionName.USER_ROLE_UPDATE,
            PermissionName.USER_ROLE_DELETE,
        ]),
        children: [
            { path: '', component: () => import('./pages/users/[id]/index.vue') },
            {
                path: 'authenticators',
                component: () => import('./pages/users/[id]/authenticators.vue'),
                meta: { [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.USER_AUTHENTICATOR_READ] },
            },
            {
                path: 'identity-provider-accounts',
                component: () => import('./pages/users/[id]/identity-provider-accounts.vue'),
                meta: { [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.IDENTITY_PROVIDER_ACCOUNT_READ] },
            },
            { path: 'permissions', component: () => import('./pages/users/[id]/permissions.vue') },
            { path: 'roles', component: () => import('./pages/users/[id]/roles.vue') },
            {
                path: 'sessions',
                component: () => import('./pages/users/[id]/sessions.vue'),
                meta: { [LayoutKey.REQUIRED_PERMISSIONS]: [PermissionName.SESSION_READ] },
            },
        ],
    },

    // deep links that match nothing land on the start page
    {
        path: '/:pathMatch(.*)*',
        redirect: '/',
    },
];

export function createAdminConsoleRouter(basePath: string) : Router {
    return createRouter({
        // The base path is the mount point (default /console/admin): route paths
        // above are relative to it, so the app works embedded under a
        // publicUrl sub-path and on a standalone host alike.
        history: createWebHistory(basePath),
        routes,
    });
}
