/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IContainer } from 'eldin';
import type { IModule } from 'orkos';
import { serve } from 'routup/node';
import { ConsoleInjectionKey, ConsoleModuleName } from './constants';
import type { ConsoleConfig, ConsoleHTTPModuleContext, ConsoleServer } from './types';

/**
 * The console's listener: build the handler, serve it, close it.
 *
 * Declares the config module as a dependency rather than reaching for the
 * token and hoping, so a graph that forgot it fails at setup with a module
 * name instead of an unresolved token at the first request.
 */
export class ConsoleHTTPModule<C extends ConsoleConfig = ConsoleConfig> implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    protected ctx : ConsoleHTTPModuleContext<C>;

    protected instance : ConsoleServer | undefined;

    constructor(ctx: ConsoleHTTPModuleContext<C>) {
        this.name = ConsoleModuleName.HTTP;
        this.dependencies = [ConsoleModuleName.CONFIG];
        this.ctx = ctx;
    }

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(ConsoleInjectionKey.Config) as C;

        const app = await this.ctx.createHandler(config);

        const server = serve(app, {
            port: config.port,
            hostname: config.host,
            silent: true,
        });

        await server.ready();

        this.instance = server;

        container.register(ConsoleInjectionKey.App, { useValue: app });
        container.register(ConsoleInjectionKey.Server, { useValue: server });
    }

    async teardown(): Promise<void> {
        // `true` closes active connections. A console serves documents and
        // assets over keep-alive sockets, so waiting for them to go idle means
        // waiting out the client's own timeout: a container stop would sit at
        // the force-exit deadline every time.
        await this.instance?.close(true);
        this.instance = undefined;
    }
}
