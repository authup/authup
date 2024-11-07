/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineNuxtRouteMiddleware, navigateTo } from '#imports';
import { RoutingInterceptor } from '../helpers';

export default defineNuxtRouteMiddleware(
    async (to, from) => {
        const interceptor = new RoutingInterceptor();

        const redirectRoute = await interceptor.execute(to, from);
        if (redirectRoute) {
            return navigateTo(redirectRoute);
        }

        return undefined;
    },
);
