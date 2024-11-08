/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    type Store, type StoreToRefs, injectStore, storeToRefs,
} from '@authup/client-web-kit';
import { type PolicyIdentity, hasOwnProperty } from '@authup/kit';
import type { RouteLocationAsPathGeneric, RouteLocationNormalized } from 'vue-router';
import type { NuxtApp } from '#app';
import { RouteMetaKey } from '../constants';
import type { AuthupRuntimeOptions } from '../types';

export class RoutingInterceptor {
    protected store : Store;

    protected storeRefs : StoreToRefs<Store>;

    protected homeRoute: string;

    protected loginRoute : string;

    constructor(nuxtApp: NuxtApp) {
        this.store = injectStore(nuxtApp.$pinia, nuxtApp.vueApp);
        this.storeRefs = storeToRefs(this.store);

        const runtimeOptions = nuxtApp.$config.public.authup as AuthupRuntimeOptions;

        this.homeRoute = runtimeOptions.homeRoute || '/';
        this.loginRoute = runtimeOptions.loginRoute || '/login';
    }

    async execute(
        to: RouteLocationNormalized,
        from: RouteLocationNormalized,
    ) : Promise<RouteLocationAsPathGeneric | undefined> {
        try {
            await this.store.resolve();
        } catch (e) {
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

                return {
                    path: this.loginRoute,
                };
            }

            if (this.hasLoggedOutCondition(from)) {
                await this.store.logout();

                return {
                    path: from.fullPath,
                };
            }

            return {
                path: from.fullPath,
            };
        }

        return undefined;
    }

    protected hasLoggedInCondition(route: RouteLocationNormalized) {
        return route.matched.some(
            (matched) => !!matched.meta[RouteMetaKey.REQUIRED_LOGGED_IN],
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
            (matched) => matched.meta[RouteMetaKey.REQUIRED_LOGGED_OUT],
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
            (matched) => !!matched.meta[RouteMetaKey.REQUIRED_PERMISSIONS],
        );
    }

    protected async validatePermissionCondition(route: RouteLocationNormalized) : Promise<boolean> {
        if (!this.hasPermissionCondition(route)) {
            return true;
        }

        let identity : PolicyIdentity | undefined;
        if (this.storeRefs.userId.value) {
            identity = {
                type: 'user',
                id: this.storeRefs.userId.value,
            };
        }

        for (let i = 0; i < route.matched.length; i++) {
            const match = route.matched[i];

            if (!match.meta || !hasOwnProperty(match.meta, RouteMetaKey.REQUIRED_PERMISSIONS)) {
                continue;
            }

            let permissions : string[] = [];
            if (match.meta[RouteMetaKey.REQUIRED_PERMISSIONS]) {
                if (Array.isArray(match.meta[RouteMetaKey.REQUIRED_PERMISSIONS])) {
                    permissions = match.meta[RouteMetaKey.REQUIRED_PERMISSIONS];
                } else if (typeof match.meta[RouteMetaKey.REQUIRED_PERMISSIONS] === 'string') {
                    permissions = [match.meta[RouteMetaKey.REQUIRED_PERMISSIONS]];
                }
            }

            if (permissions.length === 0) {
                continue;
            }

            try {
                await this.store.permissionChecker.preCheckOneOf({
                    name: permissions,
                    data: {
                        identity,
                    },
                });
            } catch (e) {
                return false;
            }
        }

        return true;
    }

    protected hasQueryRedirectProperty(route: RouteLocationNormalized) {
        return route.query && !!route.query.redirect;
    }
}
