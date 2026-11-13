/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Application } from 'orkos';
import { markShuttingDown } from '../health';
import { InjectionKey } from './constants';
import type { ShutdownOptions } from './types';

/**
 * The drain of one or more console applications sharing a process: the
 * signal flips each one's `GET /readyz` to 503, and the longest
 * `shutdownDelay` among them (seconds in the config, milliseconds here) is
 * how long the caller keeps serving before it tears them down.
 */
export function buildShutdownOptions(applications: Application[]) : ShutdownOptions {
    const delays = applications.map((application) => {
        const config = application.container.tryResolve(InjectionKey.Config);

        return config.success ? (config.data.shutdownDelay ?? 0) * 1_000 : 0;
    });

    return {
        delay: Math.max(0, ...delays),
        onSignal: () => {
            for (const application of applications) {
                const app = application.container.tryResolve(InjectionKey.App);

                if (app.success) {
                    markShuttingDown(app.data);
                }
            }
        },
    };
}
