/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DataSource } from 'typeorm';
import { DATABASE_HEALTH_CHECK_TIMEOUT, DATABASE_HEALTH_CHECK_TTL } from './constants.ts';
import type {
    DatabaseHealthCheckOptions,
    HealthCheck,
    HealthReport,
    ShutdownState,
} from './types.ts';

export async function runHealthChecks(checks: HealthCheck[]): Promise<HealthReport> {
    const results = await Promise.all(checks.map(async (check) => {
        let ok : boolean;

        try {
            ok = await check.run();
        } catch {
            ok = false;
        }

        return { name: check.name, ok };
    }));

    return {
        healthy: results.every((result) => result.ok),
        checks: results,
    };
}

export function createDatabaseHealthCheck(
    dataSource: Pick<DataSource, 'query'>,
    options: DatabaseHealthCheckOptions = {},
): HealthCheck {
    const timeout = options.timeout ?? DATABASE_HEALTH_CHECK_TIMEOUT;
    const ttl = options.ttl ?? DATABASE_HEALTH_CHECK_TTL;

    let pending : Promise<boolean> | undefined;
    let last : { ok: boolean, at: number } | undefined;

    // Tracked apart from the bounded answer: a query that outlives the
    // timeout still holds its connection, so no second one is issued until
    // it settles. Probes during a stall would otherwise pile queries onto
    // the pool for as long as the stall lasts.
    let query : Promise<boolean> | undefined;

    const ping = () => {
        if (!query) {
            const started = Promise.try(() => dataSource.query('SELECT 1'))
                .then(() => true, () => false)
                .finally(() => {
                    if (query === started) {
                        query = undefined;
                    }
                });

            query = started;
        }

        const current = query;

        return new Promise<boolean>((resolve) => {
            const timer = setTimeout(() => resolve(false), timeout);

            timer.unref();

            current.then((ok) => {
                clearTimeout(timer);
                resolve(ok);
            });
        });
    };

    return {
        name: 'database',
        run: () => {
            if (last && Date.now() - last.at < ttl) {
                return last.ok;
            }

            if (!pending) {
                pending = ping().then((ok) => {
                    last = { ok, at: Date.now() };
                    pending = undefined;

                    return ok;
                });
            }

            return pending;
        },
    };
}

export function createShutdownHealthCheck(state: ShutdownState): HealthCheck {
    return {
        name: 'shutdown',
        run: () => !state.active,
    };
}
