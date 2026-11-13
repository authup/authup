/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IApp, IAppEvent } from 'routup';
import { defineCoreHandler } from 'routup';
import { HEALTH_LIVENESS_PATH, HEALTH_READINESS_PATH } from './constants';
import type { ShutdownState } from './types';

/**
 * Keyed by the app the routes were mounted on, so two consoles in one
 * process never share a state.
 */
const states = new WeakMap<IApp, ShutdownState>();

function answer(event: IAppEvent, checks: { name: string, ok: boolean }[]) {
    const healthy = checks.every((check) => check.ok);

    event.response.status = healthy ? 200 : 503;
    event.response.headers.set('cache-control', 'no-store');

    return { healthy, checks };
}

/**
 * `GET /livez` and `GET /readyz`, the two paths every authup listener
 * answers. A console has no dependency of its own to report: it serves files,
 * and an unreachable API is the page's error to render, not a reason to take
 * the console out of rotation. So `/livez` is constant, and `/readyz` fails
 * only once {@link markShuttingDown} was called for this app.
 */
export function mountHealthRoutes(app: IApp) : void {
    const state : ShutdownState = { active: false };

    states.set(app, state);

    app.use(defineCoreHandler({
        method: 'get',
        path: HEALTH_LIVENESS_PATH,
        fn: (event) => answer(event, []),
    }));

    app.use(defineCoreHandler({
        method: 'get',
        path: HEALTH_READINESS_PATH,
        fn: (event) => answer(event, [{ name: 'shutdown', ok: !state.active }]),
    }));
}

/**
 * `GET /readyz` of this app answers 503 from now on. A no-op for an app
 * without the health routes.
 */
export function markShuttingDown(app: IApp) : void {
    const state = states.get(app);

    if (state) {
        state.active = true;
    }
}
