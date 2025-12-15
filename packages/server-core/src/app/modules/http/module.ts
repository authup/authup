/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Logger } from '@auhtup/server-kit';
import { Router } from 'routup';
import type { HTTPMiddlewareRegistrationOptions, IServer } from '../../../adapters/http';
import {
    createHttpServer,
    registerErrorMiddleware,
    registerHTTPMiddlewares,
} from '../../../adapters/http';
import type { Config } from '../../../config';
import type { DependencyContainer } from '../../../core';
import type { ApplicationModule } from '../types';
import { HTTPInjectionKey } from './constants';

export class HTTPModule implements ApplicationModule {
    protected container : DependencyContainer;

    protected instance : IServer | undefined;

    // ----------------------------------------------------

    constructor(container: DependencyContainer) {
        this.container = container;
    }

    // ----------------------------------------------------

    async start(): Promise<void> {
        const logger = this.container.resolve<Logger>('logger');

        logger.info('Starting http server...');

        const router = new Router();

        await this.mountRouterMiddlewaresBefore(router);
        await this.mountRouterControllers(router);
        await this.mountRouterMiddlewaresAfter(router);

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

        this.container.register(HTTPInjectionKey.Server, {
            useValue: server,
        });

        logger.info('Started http server.');
    }

    // ----------------------------------------------------

    async stop(): Promise<void> {
        if (!this.instance) return;

        this.container.unregister(HTTPInjectionKey.Server);

        this.instance.close();
        this.instance = undefined;
    }

    // ----------------------------------------------------

    async mountRouterControllers(router: Router) {
        // todo: create and mount controllers
    }

    async mountRouterMiddlewaresBefore(router: Router) {
        const config = this.container.resolve<Config>('config');

        const httpMiddlewareOptions : HTTPMiddlewareRegistrationOptions = {
            cors: config.middlewareCors,
            prometheus: config.middlewarePrometheus,
            rateLimit: config.middlewareRateLimit,
            swagger: config.middlewareSwagger,

            publicURL: config.publicUrl,
        };

        await registerHTTPMiddlewares(router, {
            options: httpMiddlewareOptions,
        });
    }

    async mountRouterMiddlewaresAfter(router: Router) {
        registerErrorMiddleware(router);
    }
}
