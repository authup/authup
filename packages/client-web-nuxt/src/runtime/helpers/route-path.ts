/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RouteLocationNormalized } from 'vue-router';

type RoutePathBuildOptions = {
    location?: RouteLocationNormalized,
    excluded?: string[]
};

export function buildRoutePath(
    context: RoutePathBuildOptions = {},
) : string | undefined {
    if (!context.location || context.location.query.redirect) {
        return undefined;
    }

    if (context.excluded) {
        for (let i = 0; i < context.excluded.length; i++) {
            if (context.location.fullPath.startsWith(context.excluded[i])) {
                return undefined;
            }
        }
    }

    return context.location.fullPath;
}
