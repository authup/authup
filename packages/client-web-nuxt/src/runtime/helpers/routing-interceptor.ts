/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type Store,
    type StoreToRefs,
    clearAuthorizationRequest,
    injectStore,
    loadAuthorizationRequest,
    storeToRefs,
} from '@authup/client-web-kit';
import { hasOwnProperty, omitRecord } from '@authup/kit';
import type { RouteLocationAsPathGeneric, RouteLocationNormalized } from 'vue-router';
import { BuiltInPolicyType, type IdentityPolicyData, definePolicyData } from '@authup/access';
import type { NuxtApp } from '#app';
import { RouteMetaKey } from '../constants';
import type { RuntimeOptions } from '../types';

export class RoutingInterceptor {
    protected store : Store;

    protected storeRefs : StoreToRefs<Store>;

    protected homeRoute: string;

    protected loginRoute : string;

    constructor(nuxtApp: NuxtApp) {
        this.store = injectStore(nuxtApp.$pinia, nuxtApp.vueApp);
        this.storeRefs = storeToRefs(this.store);

        const runtimeOptions = nuxtApp.$config.public.authup as RuntimeOptions;

        this.homeRoute = runtimeOptions.homeRoute || '/';
        this.loginRoute = runtimeOptions.loginRoute || '/login';
    }

    async execute(
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
    ) : Promise<RouteLocationAsPathGeneric | undefined> {
        const code = typeof to.query.code === 'string' ? to.query.code : undefined;
        if (code) {
            // The authorization-code exchange needs the PKCE `code_verifier`
            // persisted in sessionStorage, which exists only client-side.
            // Running it during SSR would exchange without a verifier —
            // rejected for public PKCE clients (the per-realm `web` client)
            // and burning the single-use code before the client can retry.
            // Defer entirely to the client pass; the callback route is
            // client-only (routeRules) so SSR never reaches here in practice.
            if (import.meta.server) {
                return undefined;
            }

            const request = loadAuthorizationRequest();

            try {
                if (request) {
                    const state = typeof to.query.state === 'string' ? to.query.state : undefined;
                    if (request.state !== state) {
                        throw new Error('The authorization request state does not match.');
                    }

                    await this.store.exchangeAuthorizationCode(code, {
                        code_verifier: request.code_verifier,
                        redirect_uri: request.redirect_uri,
                        client_id: request.client_id,
                        realm_id: request.realm_id,
                    });
                } else {
                    await this.store.exchangeAuthorizationCode(code);
                }

                clearAuthorizationRequest();

                // `target` is a full path (it originates from `to.fullPath`)
                // and may carry its own query/hash. Parse it so vue-router
                // doesn't URL-encode the `?`/`#` into the pathname. Only the
                // path/query/hash are used — any host is discarded, so an
                // absolute URL can't turn this into an open redirect.
                if (request?.target) {
                    const url = new URL(request.target, 'http://localhost');
                    return {
                        path: url.pathname,
                        query: Object.fromEntries(url.searchParams.entries()),
                        hash: url.hash,
                    };
                }

                return {
                    path: to.path,
                    query: omitRecord(to.query, ['code', 'state']),
                    hash: to.hash,
                };
            } catch {
                clearAuthorizationRequest();

                // Code exchange failed — strip `code`/`state` from the URL so a
                // reload can't re-attempt the (already consumed) code and loop.
                return {
                    path: to.path,
                    query: omitRecord(to.query, ['code', 'state']),
                    hash: to.hash,
                };
            }
        }

        try {
            await this.store.resolve();
        } catch {
            await this.store.logout();

            if (to.fullPath.startsWith(this.loginRoute)) {
                return undefined;
            }

            return {
                path: this.loginRoute,
                query: {
                    ...(
                        !this.hasLoggedOutCondition(to) &&
                        !this.hasQueryRedirectProperty(to) ?
                            { redirect: to.fullPath } :
                            {}
                    ),
                },
            };
        }

        let isValid = this.validateLoggedInCondition(to);
        if (!isValid) {
            return {
                path: this.loginRoute,
                query: {
                    ...(
                        !this.hasQueryRedirectProperty(to) ?
                            { redirect: to.fullPath } :
                            {}
                    ),
                },
            };
        }

        isValid = this.validateLoggedOutCondition(to);
        if (!isValid) {
            await this.store.logout();

            return undefined;
        }

        isValid = await this.validatePermissionCondition(to);
        if (!isValid) {
            if (from.path === to.path) {
                await this.store.logout();

                return { path: this.loginRoute };
            }

            if (this.hasLoggedOutCondition(from)) {
                await this.store.logout();

                return { path: from.fullPath };
            }

            return { path: from.fullPath };
        }

        return undefined;
    }

    protected hasLoggedInCondition(route: RouteLocationNormalized) {
        return route.matched.some(
            (matched) => !!matched.meta[RouteMetaKey.REQUIRE_LOGGED_IN],
        );
    }

    protected validateLoggedInCondition(route: RouteLocationNormalized) {
        if (!this.hasLoggedInCondition(route)) {
            return true;
        }

        return !!this.storeRefs.loggedIn.value;
    }

    protected hasLoggedOutCondition(route: RouteLocationNormalized) {
        return route.matched.some(
            (matched) => matched.meta[RouteMetaKey.REQUIRE_LOGGED_OUT],
        );
    }

    protected validateLoggedOutCondition(route: RouteLocationNormalized) {
        if (!this.hasLoggedOutCondition(route)) {
            return true;
        }

        return !this.storeRefs.loggedIn.value;
    }

    protected hasPermissionCondition(route: RouteLocationNormalized) {
        return route.matched.some(
            (matched) => !!matched.meta[RouteMetaKey.REQUIRE_PERMISSIONS],
        );
    }

    protected async validatePermissionCondition(route: RouteLocationNormalized) : Promise<boolean> {
        if (!this.hasPermissionCondition(route)) {
            return true;
        }

        let identity : IdentityPolicyData | undefined;
        if (this.storeRefs.userId.value) {
            identity = {
                type: 'user',
                id: this.storeRefs.userId.value,
            };
        }

        for (let i = 0; i < route.matched.length; i++) {
            const match = route.matched[i];

            if (!match || !match.meta || !hasOwnProperty(match.meta, RouteMetaKey.REQUIRE_PERMISSIONS)) {
                continue;
            }

            let permissions : string[] = [];
            if (match.meta[RouteMetaKey.REQUIRE_PERMISSIONS]) {
                if (Array.isArray(match.meta[RouteMetaKey.REQUIRE_PERMISSIONS])) {
                    permissions = match.meta[RouteMetaKey.REQUIRE_PERMISSIONS];
                } else if (typeof match.meta[RouteMetaKey.REQUIRE_PERMISSIONS] === 'string') {
                    permissions = [match.meta[RouteMetaKey.REQUIRE_PERMISSIONS]];
                }
            }

            if (permissions.length === 0) {
                continue;
            }

            try {
                await this.store.permissionEvaluator.preEvaluateOneOf({
                    name: permissions,
                    data: definePolicyData({ [BuiltInPolicyType.IDENTITY]: identity }),
                });
            } catch {
                return false;
            }
        }

        return true;
    }

    protected hasQueryRedirectProperty(route: RouteLocationNormalized) {
        return route.query && !!route.query.redirect;
    }
}
