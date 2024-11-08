/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineNuxtRouteMiddleware, navigateTo, useNuxtApp } from '#imports';
import type { MiddlewareHookPayload } from '../../types';
import { RoutingInterceptor } from '../helpers';

export default defineNuxtRouteMiddleware(
    async (to, from) => {
        const nuxtApp = useNuxtApp();
        const interceptor = new RoutingInterceptor(nuxtApp);

        const hookPayload : MiddlewareHookPayload = {
            to,
            from,
        };

        await nuxtApp.callHook('authup:middleware:start', hookPayload);

        const redirectRoute = await interceptor.execute(to, from);
        if (redirectRoute) {
            await nuxtApp.callHook('authup:middleware:redirect', hookPayload);

            return navigateTo(redirectRoute);
        }

        await nuxtApp.callHook('authup:middleware:end', hookPayload);

        return undefined;
    },
);
