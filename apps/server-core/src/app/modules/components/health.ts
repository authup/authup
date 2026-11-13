/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Server } from 'node:http';
import { createServer } from 'node:http';
import type { IContainer } from 'eldin';
import type { IModule, ModuleDependency } from 'orkos';
import { ConfigInjectionKey } from '../config/index.ts';
import { ModuleName } from '../constants.ts';
import { LoggerInjectionKey } from '../logger/index.ts';
import { HEALTH_LIVENESS_PATH, HEALTH_READINESS_PATH } from '../http/health/constants.ts';
import { ComponentsInjectionKey } from './constants.ts';
import type { WorkerHealthReport } from './types.ts';

/**
 * The worker role's only listener, `GET` and `HEAD` alike (the image
 * healthcheck's `wget --spider` sends `HEAD`), 200 or 503:
 *
 * - `/readyz` fails while a component is overdue or hung.
 * - `/livez` fails while a component is hung, which only a restart remedies.
 *   An overdue one (a database outage) is not helped by a restart.
 * - `/` answers what `/readyz` answers. Deprecated, removed in v1.0.0.
 *
 * Every other request answers 404. No routing, no authentication.
 *
 * It takes the HTTP slot, so the worker composition still has one module per
 * concern, and binds `core.worker.port` on `core.host`.
 */
export class WorkerHealthModule implements IModule {
    readonly name: string;

    readonly dependencies: (string | ModuleDependency)[];

    server: Server | undefined;

    constructor() {
        this.name = ModuleName.HTTP;
        this.dependencies = [
            ModuleName.CONFIG,
            ModuleName.LOGGER,
            { name: ModuleName.COMPONENTS, optional: true },
        ];
    }

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const logger = container.resolve(LoggerInjectionKey);
        const components = container.tryResolve(ComponentsInjectionKey);

        const server = createServer((req, res) => {
            const path = (req.url || '').split('?')[0];

            const liveness = path === HEALTH_LIVENESS_PATH;

            if (
                (!liveness && path !== HEALTH_READINESS_PATH && path !== '/') ||
                (req.method !== 'GET' && req.method !== 'HEAD')
            ) {
                res.statusCode = 404;
                res.end();

                return;
            }

            const health = components.success ?
                components.data.getHealth() :
                {
                    healthy: true, 
                    hung: false, 
                    components: [], 
                };

            const healthy = liveness ? !health.hung : health.healthy;
            const report : WorkerHealthReport = { healthy, checks: [{ name: 'components', ok: healthy }] };

            if (!liveness) {
                report.components = health.components;
            }

            const body = JSON.stringify(report);

            res.statusCode = healthy ? 200 : 503;
            res.setHeader('content-type', 'application/json');
            res.setHeader('content-length', Buffer.byteLength(body));
            res.setHeader('cache-control', 'no-store');
            res.end(req.method === 'HEAD' ? undefined : body);
        });

        await new Promise<void>((resolve, reject) => {
            server.once('error', reject);
            server.listen(config.worker.port, config.host || undefined, () => {
                server.off('error', reject);
                resolve();
            });
        });

        // an error after listen (e.g. EMFILE on accept) must not become an
        // uncaught exception that takes the sweeps down with the listener
        server.on('error', (e) => {
            logger.warn('The worker health listener failed.');
            logger.warn(e);
        });

        this.server = server;

        const address = server.address();
        const port = address && typeof address === 'object' ? address.port : config.worker.port;

        logger.info(`Worker health listener on port ${port}.`);
    }

    async teardown(): Promise<void> {
        const { server } = this;

        this.server = undefined;

        if (!server) {
            return;
        }

        server.closeAllConnections();
        await new Promise<void>((resolve) => {
            server.close(() => resolve());
        });
    }
}
