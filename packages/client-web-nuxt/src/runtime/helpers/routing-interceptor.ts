/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type Store,
    StoreAuthStatus,
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

            // A destination is a site-relative path and nothing else. It
            // reaches us as URL input now rather than as same-origin state,
            // so an absolute `https://evil.test/x`, a protocol-relative
            // `//evil.test/x` and a `javascript:` scheme are all dropped
            // outright instead of being coerced into something that merely
            // looks local — an attacker-chosen path is not an improvement
            // over an attacker-chosen host.
            const { redirect } = to.query;
            const destination = typeof redirect === 'string' &&
                redirect.startsWith('/') &&
                !redirect.startsWith('//') ?
                redirect :
                undefined;

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

                // The post-login destination rides in the callback URI's own
                // query, so the authorization server carried it back next to
                // `code` and `state`. That makes it URL input rather than
                // same-origin state, so only path/query/hash are used and any
                // host is discarded — otherwise a crafted authorize request
                // could turn this into an open redirect. Parsing it also stops
                // vue-router URL-encoding a `?`/`#` into the pathname.
                if (destination) {
                    const url = new URL(destination, 'http://localhost');

                    // A repeated key is a list, not a last-one-wins scalar.
                    // `Object.fromEntries(searchParams.entries())` collapses
                    // `?tag=a&tag=b` to `{ tag: 'b' }`, silently narrowing
                    // what a destination can carry; vue-router's own
                    // parseQuery keeps both.
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

                return this.withoutAuthorizationParams(to);
            } catch {
                clearAuthorizationRequest();

                // Code exchange failed — strip the authorization params from
                // the URL so a reload can't re-attempt the (already consumed)
                // code and loop.
                return this.withoutAuthorizationParams(to);
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
                // Deliberately no `redirect`: the user was denied the route
                // they are already on, so carrying it into the login would
                // send them straight back into the same denial.
                await this.store.logout();

                return { path: this.loginRoute };
            }

            if (this.hasLoggedOutCondition(from)) {
                await this.store.logout();

                return this.backTo(from);
            }

            // A just-completed login arrives here from the callback route, and
            // sending the user back there is wrong twice over. That page's
            // only job is to bounce onward to the home route, so the denial
            // reads as "you were dropped somewhere random" rather than "you
            // may not open that page" — and `backTo` carries the query, so
            // the spent `code` would ride along and be re-exchanged. Name the
            // home route directly.
            if (typeof from.query.code === 'string') {
                return { path: this.homeRoute };
            }

            return this.backTo(from);
        }

        return undefined;
    }

    protected withoutAuthorizationParams(
        route: RouteLocationNormalized,
    ) : RouteLocationAsPathGeneric {
        return {
            path: route.path,
            query: omitRecord(route.query, ['code', 'state', 'redirect']),
            hash: route.hash,
        };
    }

    /**
     * Return to a route the user already had.
     *
     * Passing `fullPath` as `path` looks equivalent and is not: vue-router
     * runs it through `parseURL`, which keeps the path and silently discards
     * the query and hash, so a bounce off `/users?page=2#row-7` used to land
     * on a bare `/users`.
     */
    protected backTo(route: RouteLocationNormalized) : RouteLocationAsPathGeneric {
        return {
            path: route.path,
            query: route.query,
            hash: route.hash,
        };
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

        return this.storeRefs.status.value === StoreAuthStatus.AUTHENTICATED;
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

        return this.storeRefs.status.value !== StoreAuthStatus.AUTHENTICATED;
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
