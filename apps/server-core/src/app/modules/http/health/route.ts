/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IApp, IAppEvent } from 'routup';
import { defineCoreHandler } from 'routup';
import { runHealthChecks } from './check.ts';
import { HEALTH_LIVENESS_PATH, HEALTH_READINESS_PATH } from './constants.ts';
import type {
    HealthCheck,
    HealthReport,
    HealthReportObserver,
    HealthRoutesOptions,
} from './types.ts';

async function report(
    event: IAppEvent,
    checks: HealthCheck[],
    observer?: HealthReportObserver,
): Promise<HealthReport> {
    const output = await runHealthChecks(checks);

    if (observer) {
        observer(output);
    }

    event.response.status = output.healthy ? 200 : 503;
    event.response.headers.set('cache-control', 'no-store');

    return output;
}

/**
 * `GET /livez` and `GET /readyz`. Mounted ahead of every middleware, so a
 * probe is neither logged, rate limited nor authenticated, and a failing
 * dependency is reported by the route instead of by a middleware in front.
 */
export function mountHealthRoutes(app: IApp, options: HealthRoutesOptions): void {
    app.get(HEALTH_LIVENESS_PATH, defineCoreHandler((event) => report(event, options.liveness)));
    app.get(HEALTH_READINESS_PATH, defineCoreHandler((event) => report(event, options.readiness, options.onReadiness)));
}
