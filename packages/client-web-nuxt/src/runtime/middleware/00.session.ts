/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { storeToRefs, useStore } from '@authup/client-web-kit';
import { defineNuxtRouteMiddleware, navigateTo, useRuntimeConfig } from '#imports';
import { RouteMetaKey } from '../constants';
import { buildRoutePath, checkRoutePermissions } from '../helpers';
import type { AuthupRuntimeOptions } from '../types';

export default defineNuxtRouteMiddleware(
    async (to, from) => {
        const store = useStore();
        const storeRefs = storeToRefs(store);
        const runtimeConfig = useRuntimeConfig();

        const runtimeOptions = runtimeConfig.public.authup as AuthupRuntimeOptions;

        const homeRoute = runtimeOptions.homeRoute || '/';
        const loginRoute = runtimeOptions.loginRoute || '/login';
        const logoutRoute = runtimeOptions.logoutRoute || '/logout';

        try {
            await store.resolve();
        } catch (e) {
            store.logout();

            const redirect = buildRoutePath({
                location: to,
                excluded: [
                    logoutRoute,
                    loginRoute,
                ],
            });

            if (redirect) {
                return navigateTo({
                    path: loginRoute,
                    query: {
                        redirect,
                    },
                });
            }

            return undefined;
        }

        const hasLoggedInProtection = to.matched.some(
            (matched) => !!matched.meta[RouteMetaKey.REQUIRED_LOGGED_IN],
        );
        if (hasLoggedInProtection && !storeRefs.loggedIn.value) {
            const redirect = buildRoutePath({
                location: to,
                excluded: [
                    logoutRoute,
                    loginRoute,
                ],
            });

            return navigateTo({
                path: loginRoute,
                query: {
                    ...(redirect ? { redirect } : {}),
                },
            });
        }

        const hasPermissionProtection = to.matched.some(
            (matched) => !!matched.meta[RouteMetaKey.REQUIRED_PERMISSIONS],
        );
        if (hasPermissionProtection) {
            const hasPermissions = await checkRoutePermissions({
                store,
                routeLocation: to,
            });

            if (!hasPermissions) {
                return navigateTo({
                    path: from ? from.fullPath : homeRoute,
                });
            }
        }

        const hasLoggedOutProtection = to.matched.some(
            (matched) => matched.meta[RouteMetaKey.REQUIRED_LOGGED_OUT],
        );

        if (hasLoggedOutProtection && storeRefs.loggedIn.value) {
            store.logout();

            return navigateTo({
                path: to.fullPath,
            });
        }

        return undefined;
    },
);
