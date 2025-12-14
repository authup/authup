/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IServer } from '../../../adapters/http';
import { createHttpServer, createRouter } from '../../../adapters/http';
import type { DependencyContainer } from '../../../core';
import type { ApplicationModule, ApplicationModuleContext } from '../types';

export class HTTPModule implements ApplicationModule {
    protected container : DependencyContainer<ApplicationModuleContext>;

    protected instance : IServer | undefined;

    // ----------------------------------------------------

    constructor(container: DependencyContainer<ApplicationModuleContext>) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const logger = this.container.resolve('logger');

        logger.info('Starting http server...');

        const router = await createRouter();
        const server = createHttpServer({ router });

        await new Promise<void>((resolve, reject) => {
            const errorHandler = (err?: null | Error) => {
                reject(err);
            };

            server.once('error', errorHandler);
            server.once('listening', () => {
                server.removeListener('error', errorHandler);

                resolve();
            });

            server.listen();
        });

        this.container.register('httpServer', server);

        logger.info('Started http server.');
    }

    // ----------------------------------------------------

    async stop(): Promise<void> {
        if (!this.instance) return;

        this.container.unregister('httpServer');

        this.instance.close();
        this.instance = undefined;
    }
}
