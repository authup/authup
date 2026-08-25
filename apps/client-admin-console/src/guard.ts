/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, definePolicyData } from '@authup/access';
import type { IdentityPolicyData } from '@authup/access';
import type { Store } from '@authup/client-web-kit';
import {
    StoreAuthStatus,
    clearAuthorizationRequest,
    loadAuthorizationRequest,
    storeToRefs,
} from '@authup/client-web-kit';
import { hasOwnProperty, omitRecord } from '@authup/kit';
import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router';
import type { AdminConsoleConfig } from './config';
import { LayoutKey } from './config/layout';
import { loadLoginRedirect, resolveLoginRedirect } from './redirect';

export type RoutingGuardContext = {
    store: Store,
    config: Pick<AdminConsoleConfig, 'cookieSession'>,
    homeRoute?: string,
    loginRoute?: string,
};

export type RoutingGuard = (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
) => Promise<RouteLocationRaw | undefined>;

/**
 * A site-relative destination as a route location. Handing vue-router the
 * raw string would URL-encode its `?`/`#` into the pathname, so the parts
 * are passed separately; a repeated query key stays a list.
 */
function toRouteLocation(destination: string) : RouteLocationRaw {
    const url = new URL(destination, 'http://localhost');

    const query : Record<string, string | string[]> = {};
    for (const key of new Set(url.searchParams.keys())) {
        const values = url.searchParams.getAll(key);
        query[key] = values.length > 1 ? values : values[0];
    }

    return {
        path: url.pathname,
        query,
        hash: url.hash,
    };
}

function withoutAuthorizationParams(route: RouteLocationNormalized) : RouteLocationRaw {
    return {
        path: route.path,
        query: omitRecord(route.query, ['code', 'state', 'redirect']),
        hash: route.hash,
    };
}

/**
 * Return to a route the user already had. Passing `fullPath` as `path`
 * looks equivalent and is not: vue-router runs it through `parseURL`, which
 * keeps the path and silently discards the query and hash.
 */
function backTo(route: RouteLocationNormalized) : RouteLocationRaw {
    return {
        path: route.path,
        query: route.query,
        hash: route.hash,
    };
}

function hasMeta(route: RouteLocationNormalized, key: LayoutKey) : boolean {
    return route.matched.some((matched) => !!matched.meta[key]);
}

/**
 * The navigation guard: the session resolve, the code exchange (bearer mode
 * only) and the three route gates (`requireLoggedIn`, `requireLoggedOut`,
 * `requirePermissions`). The port of `@authup/client-web-nuxt`'s
 * RoutingInterceptor, plus the cookie-mode rules the account console
 * established.
 */
export function createRoutingGuard(ctx: RoutingGuardContext) : RoutingGuard {
    const { store } = ctx;
    const storeRefs = storeToRefs(store);
    const homeRoute = ctx.homeRoute || '/';
    const loginRoute = ctx.loginRoute || '/login';

    const isAuthenticated = () => storeRefs.status.value === StoreAuthStatus.AUTHENTICATED;

    const validatePermissions = async (route: RouteLocationNormalized) : Promise<boolean> => {
        let identity : IdentityPolicyData | undefined;
        if (storeRefs.userId.value) {
            identity = { type: 'user', id: storeRefs.userId.value };
        }

        for (const match of route.matched) {
            if (!match.meta || !hasOwnProperty(match.meta, LayoutKey.REQUIRED_PERMISSIONS)) {
                continue;
            }

            const permissions = match.meta[LayoutKey.REQUIRED_PERMISSIONS] ?? [];
            if (permissions.length === 0) {
                continue;
            }

            try {
                await store.permissionEvaluator.preEvaluateOneOf({
                    name: permissions,
                    data: definePolicyData({ [BuiltInPolicyType.IDENTITY]: identity }),
                });
            } catch {
                return false;
            }
        }

        return true;
    };

    return async (to, from) => {
        // Cookie mode redeems the code SERVER-side (`GET /console/admin/callback`), so
        // no code ever lands on a client route and nothing here has a PKCE
        // verifier to present. The branch stays for a standalone host on a
        // foreign origin, where the cookie can never be presented.
        const code = !ctx.config.cookieSession && typeof to.query.code === 'string' ?
            to.query.code :
            undefined;
        if (code) {
            // Single use either way: consumed on success, dropped on failure
            // (a reload must not replay the code).
            const request = loadAuthorizationRequest();
            const destination = resolveLoginRedirect(to.query.redirect);

            try {
                if (request) {
                    const state = typeof to.query.state === 'string' ? to.query.state : undefined;
                    if (request.state !== state) {
                        throw new Error('The authorization request state does not match.');
                    }

                    await store.exchangeAuthorizationCode(code, {
                        code_verifier: request.code_verifier,
                        redirect_uri: request.redirect_uri,
                        client_id: request.client_id,
                        realm_id: request.realm_id,
                    });
                } else {
                    await store.exchangeAuthorizationCode(code);
                }

                clearAuthorizationRequest();

                return destination ?
                    toRouteLocation(destination) :
                    withoutAuthorizationParams(to);
            } catch {
                clearAuthorizationRequest();

                return withoutAuthorizationParams(to);
            }
        }

        // The destination the visitor asked for before the server-side kick
        // (cookie mode); the callback lands on the root, so it rides a stash.
        // Popped on every navigation so nothing stale survives.
        const pendingRedirect = ctx.config.cookieSession ? loadLoginRedirect() : undefined;

        try {
            await store.resolve();

            // A settled resolve leaves the session either complete or absent,
            // so anything else is a session this console cannot render (a
            // subject that is not a user keeps `user` null). Treat it like a
            // failed resolve.
            if (ctx.config.cookieSession && storeRefs.status.value === StoreAuthStatus.RESTORING) {
                await store.logout({ revoke: false });
            }
        } catch {
            // `revoke: false` is load-bearing in cookie mode: a plain logout()
            // ends the server-side session, and this fires on ANY failed
            // resolve (a 5xx, an aborted request), none of which is an intent
            // to sign out.
            if (ctx.config.cookieSession) {
                await store.logout({ revoke: false });
            } else {
                await store.logout();
            }

            if (to.fullPath.startsWith(loginRoute)) {
                return undefined;
            }

            return {
                path: loginRoute,
                query: {
                    ...(
                        !hasMeta(to, LayoutKey.REQUIRED_LOGGED_OUT) && !to.query.redirect ?
                            { redirect: to.fullPath } :
                            {}
                    ),
                },
            };
        }

        if (pendingRedirect && isAuthenticated()) {
            return toRouteLocation(pendingRedirect);
        }

        if (hasMeta(to, LayoutKey.REQUIRED_LOGGED_IN) && !isAuthenticated()) {
            return {
                path: loginRoute,
                query: { ...(!to.query.redirect ? { redirect: to.fullPath } : {}) },
            };
        }

        // The gates below never end the session. The Nuxt interceptor
        // logged out here, which was a local teardown in bearer mode; in
        // cookie mode `logout()` revokes the one `auth_sessions` row every
        // surface on the origin shares, so a Back press onto `/login` after
        // signing in would sign the user out of the account console too. A
        // signed-in visitor on a logged-out-only page is simply sent home.
        if (hasMeta(to, LayoutKey.REQUIRED_LOGGED_OUT) && isAuthenticated()) {
            return { path: homeRoute };
        }

        if (hasMeta(to, LayoutKey.REQUIRED_PERMISSIONS) && !(await validatePermissions(to))) {
            // Denied the route they are already on (a reload after a
            // permission was withdrawn), or coming from a logged-out-only
            // page: `backTo` would bounce straight back into the denial, so
            // land on the home route instead.
            if (from.path === to.path || hasMeta(from, LayoutKey.REQUIRED_LOGGED_OUT)) {
                return { path: homeRoute };
            }

            // A just-completed login arrives from the callback route, whose
            // only job is to bounce onward, and `backTo` would carry the spent
            // `code` along. Name the home route directly.
            if (typeof from.query.code === 'string') {
                return { path: homeRoute };
            }

            return backTo(from);
        }

        return undefined;
    };
}
