/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@authup/server-kit';
import { Router } from 'routup';
import type { IServer } from '../../../adapters/http';
import {
    createHttpServer,
} from '../../../adapters/http';
import type { Module } from '../types';
import { HTTPInjectionKey } from './constants';
import type { IDIContainer } from '../../../core';
import { HTTPControllerModule, HTTPMiddlewareModule } from './modules';
import { LoggerInjectionKey } from '../logger';

export class HTTPModule implements Module {
    protected instance : IServer | undefined;

    protected middleware : HTTPMiddlewareModule;

    protected controller : HTTPControllerModule;

    constructor() {
        this.controller = new HTTPControllerModule();
        this.middleware = new HTTPMiddlewareModule();
    }

    // ----------------------------------------------------

    async start(container: IDIContainer): Promise<void> {
        const logger = container.resolve<Logger>(LoggerInjectionKey);

        logger.info('Starting http server...');

        const router = new Router();

        await this.middleware.mountBefore(router, container);
        await this.controller.mount(router, container);
        await this.middleware.mountAfter(router, container);

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

        container.register(HTTPInjectionKey.Server, {
            useValue: server,
        });

        logger.info('Started http server.');
    }

    // ----------------------------------------------------

    async stop(container: IDIContainer): Promise<void> {
        if (!this.instance) return;

        container.unregister(HTTPInjectionKey.Server);

        this.instance.close();
        this.instance = undefined;
    }
}
