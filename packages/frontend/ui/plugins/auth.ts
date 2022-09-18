/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { buildNameFromAbilityID } from '@authelion/common';
import {
    addRouteMiddleware, defineNuxtPlugin, navigateTo,
} from '#app';
import { LayoutKey } from '../config/layout';
import { useAuthStore } from '../store/auth';

function checkAbilityOrPermission(route, has: (name: string) => boolean) {
    const layoutKeys : string[] = [
        LayoutKey.REQUIRED_PERMISSIONS,
    ];

    let isAllowed : undefined | boolean;

    for (let i = 0; i < layoutKeys.length; i++) {
        const layoutKey = layoutKeys[i];

        for (let j = 0; j < route.meta.length; j++) {
            const matchedRecordMeta = route.meta[j];

            if (!Object.prototype.hasOwnProperty.call(matchedRecordMeta, layoutKey)) {
                continue;
            }

            const value = matchedRecordMeta[layoutKey];
            if (Array.isArray(value)) {
                isAllowed = value.some((val) => {
                    if (layoutKey !== LayoutKey.REQUIRED_PERMISSIONS) {
                        val = buildNameFromAbilityID(val);
                    }

                    return has(val);
                });
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

export default defineNuxtPlugin((ctx) => {
    addRouteMiddleware(async (to, from) => {
        const store = useAuthStore();
        await store.resolve();

        let redirectPath = '/';

        if (typeof from !== 'undefined') {
            redirectPath = from.fullPath;
        }

        if (
            to.matched.some((matched) => !!matched.meta[LayoutKey.REQUIRED_LOGGED_IN])
        ) {
            if (!store.loggedIn) {
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
                checkAbilityOrPermission(to, (name) => store.has(name));
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

            if (store.loggedIn) {
                return navigateTo({
                    path: '/logout',
                    query,
                });
            }
        }
    });
});
