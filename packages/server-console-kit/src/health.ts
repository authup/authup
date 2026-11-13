/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IApp } from 'routup';
import { defineCoreHandler } from 'routup';
import { HEALTH_LIVENESS_PATH, HEALTH_READINESS_PATH } from './constants';

/**
 * `GET /livez` and `GET /readyz`, the two paths every authup listener
 * answers. A console has no dependency of its own to report: it serves files,
 * and an unreachable API is the page's error to render, not a reason to take
 * the console out of rotation. So both are constant.
 */
export function mountHealthRoutes(app: IApp) : void {
    for (const path of [HEALTH_LIVENESS_PATH, HEALTH_READINESS_PATH]) {
        app.use(defineCoreHandler({
            method: 'get',
            path,
            fn: (event) => {
                event.response.headers.set('cache-control', 'no-store');

                return { healthy: true, checks: [] };
            },
        }));
    }
}
