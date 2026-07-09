/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { StoreDispatcherEventName, injectStoreDispatcher } from '@authup/client-web-kit';
import { defineNuxtPlugin, useRouter, useRuntimeConfig } from '#imports';
import { RouteMetaKey } from '../constants';
import type { RuntimeOptions } from '../types';

/**
 * Redirect an idle user to the login route when a background token refresh
 * fails (SESSION_EXPIRED). The route middleware already handles this on the
 * next navigation; this covers the case where the session dies while the user
 * sits on an authenticated page with no navigation to trigger the interceptor.
 */
export default defineNuxtPlugin({
    name: 'authup:session-expiry',
    dependsOn: ['authup:kit'],
    setup(ctx) {
        if (import.meta.server) {
            return;
        }

        const router = useRouter();
        const runtimeOptions = useRuntimeConfig().public.authup as RuntimeOptions;
        const loginRoute = runtimeOptions.loginRoute || '/login';

        const dispatcher = injectStoreDispatcher(ctx.vueApp);

        dispatcher.on(StoreDispatcherEventName.SESSION_EXPIRED, () => {
            const route = router.currentRoute.value;

            // Already on the login screen — nothing to bounce. Exact-match on
            // `path` (query excluded, so `/login?redirect=…` still matches);
            // a prefix check would false-positive on `/login/callback` etc.
            if (route.path === loginRoute) {
                return;
            }

            // Only redirect off pages that require a session; a public page
            // stays put (the route middleware covers its next navigation).
            const requiresLogin = route.matched.some(
                (matched) => !!matched.meta[RouteMetaKey.REQUIRE_LOGGED_IN],
            );
            if (!requiresLogin) {
                return;
            }

            router.push({
                path: loginRoute,
                query: { redirect: route.fullPath },
            }).catch(() => { /* a concurrent navigation superseded this one */ });
        });
    },
});
