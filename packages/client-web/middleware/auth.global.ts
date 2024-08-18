/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useStore } from '@authup/client-web-kit';
import { storeToRefs } from 'pinia';
import type { RouteLocationNormalized } from 'vue-router';
import {
    navigateTo,
} from '#app';
import { LayoutKey } from '../config/layout';

async function checkAbilityOrPermission(route: RouteLocationNormalized, has: (name: string) => Promise<boolean>) {
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
                let passed = false;
                for (let k = 0; k < value.length; k++) {
                    const outcome = await has(value[k]);
                    if (outcome) {
                        passed = true;
                        break;
                    }
                }
                isAllowed = passed;
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

export default defineNuxtRouteMiddleware(async (
    to,
    from,
) => {
    const store = useStore();

    let redirectPath = '/';

    if (typeof from !== 'undefined') {
        redirectPath = from.fullPath;
    }

    try {
        await store.resolve();
    } catch (e) {
        store.logout();

        if (
            !to.fullPath.startsWith('/logout') &&
            !to.fullPath.startsWith('/login')
        ) {
            return navigateTo({
                path: '/logout',
                query: {
                    redirect: redirectPath,
                },
            });
        }

        return Promise.resolve();
    }

    const { loggedIn } = storeToRefs(store);

    if (to.matched.some((matched) => !!matched.meta[LayoutKey.REQUIRED_LOGGED_IN])) {
        if (!loggedIn.value) {
            const query : Record<string, any> = {};

            if (
                !to.fullPath.startsWith('/logout') &&
                !to.fullPath.startsWith('/login')
            ) {
                query.redirect = to.fullPath;
            }

            return navigateTo({
                path: '/login',
                query,
            });
        }

        try {
            await checkAbilityOrPermission(to, (name) => store.permissionChecker.has(name));
        } catch (e) {
            return navigateTo({
                path: redirectPath,
            });
        }

        return Promise.resolve();
    }

    if (
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

    return Promise.resolve();
});
