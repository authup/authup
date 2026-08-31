/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IContainer } from 'eldin';
import type { IModule } from 'orkos';
import { serve } from 'routup/node';
import { InjectionKey, ModuleName } from './constants';
import type { Config, HTTPModuleContext, HTTPServer } from './types';

/**
 * The console's listener: build the handler, serve it, close it.
 *
 * Declares the config module as a dependency rather than reaching for the
 * token and hoping, so a graph that forgot it fails at setup with a module
 * name instead of an unresolved token at the first request.
 */
export class HTTPModule<C extends Config = Config> implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    protected ctx : HTTPModuleContext<C>;

    protected instance : HTTPServer | undefined;

    constructor(ctx: HTTPModuleContext<C>) {
        this.name = ModuleName.HTTP;
        this.dependencies = [ModuleName.CONFIG, ModuleName.THEME];
        this.ctx = ctx;
    }

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(InjectionKey.Config) as C;

        const theme = container.resolve(InjectionKey.Theme);

        const app = await this.ctx.createHandler(config, theme);

        const server = serve(app, {
            port: config.port,
            hostname: config.host,
            silent: true,
        });

        await server.ready();

        this.instance = server;

        container.register(InjectionKey.App, { useValue: app });
        container.register(InjectionKey.Server, { useValue: server });
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
