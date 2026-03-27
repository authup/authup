/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Router } from 'routup';
import type { IServer } from '../../../adapters/http/index.ts';
import {
    createHttpServer,
} from '../../../adapters/http/index.ts';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IModule } from '../types.ts';
import { ModuleName } from '../constants.ts';
import { HTTPInjectionKey } from './constants.ts';
import type { IContainer } from 'eldin';
import { HTTPControllerModule, HTTPMiddlewareModule } from './modules/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';

export class HTTPModule implements IModule {
    readonly name: string;

    readonly dependsOn: string[];

    protected instance : IServer | undefined;

    protected middleware : HTTPMiddlewareModule;

    protected controller : HTTPControllerModule;

    constructor() {
        this.name = ModuleName.HTTP;
        this.dependsOn = [ModuleName.CONFIG, ModuleName.LOGGER, ModuleName.AUTHENTICATION, ModuleName.IDENTITY, ModuleName.OAUTH2];
        this.controller = new HTTPControllerModule();
        this.middleware = new HTTPMiddlewareModule();
    }

    // ----------------------------------------------------

    async start(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const logger = container.resolve(LoggerInjectionKey);

        logger.debug('Starting http server...');

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

            server.listen(config.port, config.host);
        });

        const address = server.address();
        if (address) {
            if (typeof address === 'string') {
                logger.debug(`Listening on ${address}`);
            } else {
                logger.debug(`Listening on ${address.address}:${address.port}`);
            }
        }

        container.register(HTTPInjectionKey.Server, { useValue: server });

        logger.debug('Started http server.');
    }

    // ----------------------------------------------------

    async stop(container: IContainer): Promise<void> {
        if (!this.instance) return;

        container.unregister(HTTPInjectionKey.Server);

        this.instance.close();
        this.instance = undefined;
    }
}
