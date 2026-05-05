/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Router } from 'routup';
import { serve } from 'routup/node';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IModule } from 'orkos';
import { ModuleName } from '../constants.ts';
import type { HTTPServer } from './constants.ts';
import { HTTPInjectionKey } from './constants.ts';
import type { IContainer } from 'eldin';
import { HTTPControllerModule, HTTPMiddlewareModule } from './modules/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';

export class HTTPModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    protected instance : HTTPServer | undefined;

    protected middleware : HTTPMiddlewareModule;

    protected controller : HTTPControllerModule;

    constructor() {
        this.name = ModuleName.HTTP;
        this.dependencies = [ModuleName.CONFIG, ModuleName.LOGGER, ModuleName.AUTHENTICATION, ModuleName.IDENTITY, ModuleName.OAUTH2];
        this.controller = new HTTPControllerModule();
        this.middleware = new HTTPMiddlewareModule();
    }

    // ----------------------------------------------------

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const logger = container.resolve(LoggerInjectionKey);

        logger.debug('Starting http server...');

        const router = new Router();

        await this.middleware.mountBefore(router, container);
        await this.controller.mount(router, container);
        await this.middleware.mountAfter(router, container);

        const server = serve(router, {
            port: config.port,
            hostname: config.host,
            silent: true,
        });

        await server.ready();

        this.instance = server;

        if (server.url) {
            logger.debug(`Listening on ${server.url}`);
        }

        container.register(HTTPInjectionKey.Server, { useValue: server });

        logger.debug('Started http server.');
    }

    // ----------------------------------------------------

    async teardown(container: IContainer): Promise<void> {
        if (!this.instance) return;

        container.unregister(HTTPInjectionKey.Server);

        await this.instance.close();
        this.instance = undefined;
    }
}
