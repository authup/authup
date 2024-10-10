/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { type Store, storeToRefs } from '@authup/client-web-kit';
import { type PolicyIdentity, hasOwnProperty } from '@authup/kit';
import type { RouteLocationNormalized } from 'vue-router';
import { RouteMetaKey } from '../constants';

type RoutePermissionsCheckOptions = {
    routeLocation: RouteLocationNormalized,
    store: Store
};

export async function checkRoutePermissions(
    context: RoutePermissionsCheckOptions,
) : Promise<boolean> {
    const storeRefs = storeToRefs(context.store);

    let identity : PolicyIdentity | undefined;
    if (storeRefs.userId.value) {
        identity = {
            type: 'user',
            id: storeRefs.userId.value,
        };
    }

    for (let i = 0; i < context.routeLocation.matched.length; i++) {
        const match = context.routeLocation.matched[i];

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
            await context.store.permissionChecker.preCheckOneOf({
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
