/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { storeToRefs } from 'pinia';
import type { RouteLocationNormalized } from 'vue-router';
import {
    navigateTo,
} from '#app';
import { LayoutKey } from '../config/layout';
import { useAuthStore } from '../store/auth';

function checkAbilityOrPermission(route: RouteLocationNormalized, has: (name: string) => boolean) {
    const layoutKeys : string[] = [
        LayoutKey.REQUIRED_PERMISSIONS,
    ];

    let isAllowed : undefined | boolean;

    for (let i = 0; i < layoutKeys.length; i++) {
        const layoutKey = layoutKeys[i];

        for (let j = 0; j < route.matched.length; j++) {
            const matchedRecord = route.matched[j];

            if (!Object.prototype.hasOwnProperty.call(matchedRecord.meta, layoutKey)) {
                continue;
            }

            const value = matchedRecord.meta[layoutKey];
            if (Array.isArray(value)) {
                isAllowed = value.some((val) => has(val));
            }

            if (isAllowed) {
                return true;
            }
        }
    }

    if (typeof isAllowed === 'undefined') {
        return true;
    }

    if (!isAllowed) {
        const parts = route.path.split('/');
        parts.pop();
        throw new Error(parts.join('/'));
    }

    return true;
}

export default defineNuxtRouteMiddleware(async (to, from) => {
    const store = useAuthStore();

    let redirectPath = '/';

    if (typeof from !== 'undefined') {
        redirectPath = from.fullPath;
    }

    try {
        await store.resolve();
    } catch (e) {
        await store.logout();

        if (!to.fullPath.startsWith('/logout') && !to.fullPath.startsWith('/login')) {
            return navigateTo({
                path: '/logout',
                query: {
                    redirect: redirectPath,
                },
            });
        }

        return undefined;
    }

    const { loggedIn } = storeToRefs(store);

    if (
        to.matched.some((matched) => !!matched.meta[LayoutKey.REQUIRED_LOGGED_IN])
    ) {
        if (!loggedIn.value) {
            const query : Record<string, any> = {};

            if (!to.fullPath.startsWith('/logout')) {
                query.redirect = to.fullPath;
            }

            return navigateTo({
                path: '/login',
                query,
            });
        }

        try {
            checkAbilityOrPermission(to, (name) => store.abilities.has(name));
        } catch (e) {
            return navigateTo({
                path: redirectPath,
            });
        }
    } else if (
        !to.fullPath.startsWith('/logout') &&
        to.matched.some((matched) => matched.meta[LayoutKey.REQUIRED_LOGGED_OUT])
    ) {
        const query : Record<string, any> = {};
        if (!redirectPath.includes('logout')) {
            query.redirect = redirectPath;
        }

        if (loggedIn.value) {
            return navigateTo({
                path: '/logout',
                query,
            });
        }
    }

    return undefined;
});
