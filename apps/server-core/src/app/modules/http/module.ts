/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Client } from '@authup/core-http-kit';
import { AuthupError } from '@authup/errors';
import { App } from 'routup';
import { serve } from 'routup/node';
import { ConfigInjectionKey } from '../config/index.ts';
import type { IModule } from 'orkos';
import { createInternalUIHttpClient } from '../../../adapters/http/ui/index.ts';
import { NoopAuthFlowMetrics } from '../../../core/index.ts';
import { ModuleName } from '../constants.ts';
import type { HTTPServer } from './constants.ts';
import { HTTPInjectionKey } from './constants.ts';
import type { IContainer } from 'eldin';
import { MetricsInjectionKey, PromAuthFlowMetrics } from '../metrics/index.ts';
import { HTTPControllerModule, HTTPMiddlewareModule } from './modules/index.ts';
import { LoggerInjectionKey } from '../logger/index.ts';

export class HTTPModule implements IModule {
    readonly name: string;

    readonly dependencies: string[];

    protected instance : HTTPServer | undefined;

    protected middleware : HTTPMiddlewareModule;

    protected controller : HTTPControllerModule;

    protected uiHttpClientRegistered : boolean;

    constructor() {
        this.name = ModuleName.HTTP;
        this.dependencies = [ModuleName.CONFIG, ModuleName.LOGGER, ModuleName.AUTHENTICATION, ModuleName.IDENTITY, ModuleName.OAUTH2];
        this.controller = new HTTPControllerModule();
        this.middleware = new HTTPMiddlewareModule();
        this.uiHttpClientRegistered = false;
    }

    // ----------------------------------------------------

    async setup(container: IContainer): Promise<void> {
        const config = container.resolve(ConfigInjectionKey);
        const logger = container.resolve(LoggerInjectionKey);

        logger.debug('Starting http server...');

        // Every request helper deriving proxy-dependent request facts
        // (getRequestIP, hostname, protocol) resolves the trust contract from
        // the app options — call sites must NOT pass their own `trustProxy`.
        let router : App;
        try {
            router = new App({ options: { trustProxy: config.trustProxy } });
        } catch (e) {
            // proxy-addr compiles the allowlist form inside the App
            // constructor; its error ("invalid IP address: …") does not name
            // the offending config key — attribute it.
            throw new AuthupError(
                `Invalid trustProxy (TRUST_PROXY) configuration: ${e instanceof Error ? e.message : String(e)}`,
            );
        }

        this.registerUIHttpClient(container);
        this.registerMetrics(container);

        await this.middleware.mountBefore(router, container);
        await this.controller.mount(router, container);
        await this.middleware.mountAfter(router, container);

        const server = serve(router, {
            port: config.port,
            hostname: config.host,
            silent: true,
            // Shutdown is driven by the orkos teardown chain (see cli/commands/start.ts);
            // srvx's plugin would only close the HTTP server, leaving DB / cache / etc. open.
            gracefulShutdown: false,
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

    /**
     * Default HTTP client for the SSR'd UI pages: dispatches against the
     * server's own listen address instead of round-tripping through the
     * reverse proxy at `publicUrl` (see `createInternalUIHttpClient`).
     * Skipped when the token is already bound (test injection wins).
     * Transient lifetime is mandatory — client-web-kit's authentication
     * hook writes per-user Authorization state onto the client.
     */
    protected registerUIHttpClient(container: IContainer): void {
        if (container.has(HTTPInjectionKey.UIHttpClient)) {
            return;
        }

        container.register(HTTPInjectionKey.UIHttpClient, {
            useFactory: (c) => {
                const config = c.resolve(ConfigInjectionKey);

                // The server token is registered after listen; a resolve can
                // only happen on a request, so it is present by then. The
                // guards keep an edge case on the previous (public URL)
                // dispatch behavior instead of failing the render.
                const server = c.has(HTTPInjectionKey.Server) ?
                    c.resolve(HTTPInjectionKey.Server) :
                    undefined;

                if (server && server.url) {
                    return createInternalUIHttpClient({
                        publicURL: config.publicUrl,
                        internalURL: server.url,
                    });
                }

                return new Client({ baseURL: config.publicUrl });
            },
        }, { lifetime: 'transient' });

        this.uiHttpClientRegistered = true;
    }

    /**
     * Auth-flow metric counters for the emit points (plan 058 Part 2).
     * Registered before the controllers are built — the factories resolve the
     * token. Prometheus-backed iff the prometheus middleware is enabled
     * (mirrors HTTPMiddlewareModule.isEnabled: boolean|object, false = off),
     * otherwise a noop so emit sites never need a guard beyond `?.`.
     */
    protected registerMetrics(container: IContainer): void {
        const config = container.resolve(ConfigInjectionKey);

        const enabled = typeof config.middlewarePrometheus !== 'boolean' ||
            config.middlewarePrometheus === true;

        container.register(MetricsInjectionKey, {
            useValue: enabled ?
                new PromAuthFlowMetrics() :
                new NoopAuthFlowMetrics(),
        });
    }

    // ----------------------------------------------------

    async teardown(container: IContainer): Promise<void> {
        if (this.uiHttpClientRegistered) {
            container.unregister(HTTPInjectionKey.UIHttpClient);
            this.uiHttpClientRegistered = false;
        }

        container.unregister(MetricsInjectionKey);

        await this.middleware.teardown();

        if (!this.instance) return;

        container.unregister(HTTPInjectionKey.Server);

        await this.instance.close();
        this.instance = undefined;
    }
}
