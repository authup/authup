/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Config as AuthConsoleConfig } from '@authup/server-auth-console';
import { createHandler as createAuthConsoleHandler } from '@authup/server-auth-console';
import {
    InjectionKey,
    createApplication as createConsoleApplication,
    defineStaticConsole,
} from '@authup/server-console-kit';
import type { Application } from 'orkos';
import type { IApp, IAppEvent } from 'routup';
import { App } from 'routup';
import { fromNodeMiddleware } from 'routup/node';
import { PACKAGE_PATH } from '../path.ts';
import { HMR_PORTS } from './constants.ts';
import { createOpenInEditorGuard } from './middleware/index.ts';
import { isSourceCheckout, resolveAuthConsolePackagePath } from './package.ts';
import type { ConsoleDevServer } from './server/index.ts';
import { createAuthConsoleDevServer, createStaticConsoleDevServer } from './server/index.ts';
import type { Mount } from './types.ts';

/**
 * Wrap a console handler so a dev server sits in FRONT of it: vite answers
 * its client, its source modules and its dependency chunks, and everything it
 * declines falls through to the console's own routes.
 *
 * The guard is registered BEFORE the vite middlewares, which is the whole
 * point of it: vite mounts a process-spawning endpoint unconditionally, and
 * this listener is reachable from off the machine. See
 * `createOpenInEditorGuard`.
 */
export function compose(dev: ConsoleDevServer | undefined, handler: IApp) : IApp {
    if (!dev) {
        return handler;
    }

    const app = new App();
    app.use(createOpenInEditorGuard());
    app.use(fromNodeMiddleware(dev.middlewares));
    app.use(handler);

    return app;
}

/**
 * A console as the APPLICATION it is, which is what `authup start` mounts and
 * what both supported ways of starting one produce.
 *
 * Dev used to ask each console for a bare handler instead, so it ran neither
 * the config module nor the theme module: the one command a contributor
 * spends the day in was the only place a console came up differently from
 * production. Nothing about the handler had to change for this, because
 * `createHandler` is a caller-supplied function on the graph's own context.
 *
 * Registered for teardown BEFORE the setup rather than after it: orkos
 * unwinds a failed setup itself and then skips every module that never
 * reached ready, so tearing one down twice is a no-op while leaking one
 * strands whatever its modules opened.
 */
async function setupConsoleApplication(
    application: Application,
    register: (application: Application) => void,
) : Promise<IApp> {
    register(application);

    await application.setup();

    return application.container.resolve(InjectionKey.App);
}

export async function buildStaticMount(options: {
    name: 'admin' | 'account',
    basePath: string,
    distPath: string,
    packageName: string,
    marker: string,
    viteBase: string,
    hmrPort: number,
    createApplication: (readShell?: (event: IAppEvent) => Promise<string>) => Application,
    log: (message: string) => void,
    register: (close: () => Promise<void>) => void,
    registerApplication: (application: Application) => void,
}) : Promise<Mount> {
    const { basePath } = options;

    // Resolution is the kit's rule, never re-walked here: the anchor decides
    // which node_modules tree is searched, and getting it wrong silently
    // serves the wrong package.
    const packagePath = defineStaticConsole({
        packageName: options.packageName,
        marker: options.marker,
        viteBase: options.viteBase,
        cwd: PACKAGE_PATH,
        distPath: options.distPath || undefined,
    }).resolvePackagePath();

    if (!isSourceCheckout(packagePath)) {
        options.log(`Serving the ${options.name} console from its built bundle (no source checkout at ${packagePath ?? 'an unresolved path'}).`);

        return {
            path: basePath,
            app: await setupConsoleApplication(
                options.createApplication(),
                options.registerApplication,
            ),
        };
    }

    const dev = await createStaticConsoleDevServer({
        packageName: options.packageName,
        root: packagePath,
        basePath,
        hmrPort: options.hmrPort,
    });

    // Registered the moment the server exists, never on the way out: it
    // already holds a file watcher and an HMR websocket, so anything that
    // throws between here and the return would strand both.
    options.register(dev.close);

    // Announced only once the dev server exists. A console reported as hot
    // while its HMR socket never came up is the worst of both: edits stop
    // applying and nothing on screen says why.
    options.log(`Serving the ${options.name} console from source with HMR (${packagePath}).`);

    return {
        path: basePath,
        app: compose(dev, await setupConsoleApplication(
            options.createApplication(dev.readShell),
            options.registerApplication,
        )),
    };
}

export async function buildAuthMount(
    config: AuthConsoleConfig,
    basePath: string,
    log: (message: string) => void,
    register: (close: () => Promise<void>) => void,
    registerApplication: (application: Application) => void,
) : Promise<Mount> {
    const packagePath = resolveAuthConsolePackagePath(config.distPath);

    if (!isSourceCheckout(packagePath)) {
        log(`Serving the auth console from its built bundle (no source checkout at ${packagePath ?? 'an unresolved path'}).`);

        return {
            path: basePath,
            app: await setupConsoleApplication(
                createConsoleApplication<AuthConsoleConfig>({
                    config,
                    listen: false,
                    createHandler: (resolved, theme) => createAuthConsoleHandler(resolved, theme),
                }),
                registerApplication,
            ),
        };
    }

    const dev = await createAuthConsoleDevServer({
        packageName: '@authup/client-auth-console',
        root: packagePath,
        basePath,
        hmrPort: HMR_PORTS.auth,
    });

    register(dev.close);

    log(`Serving the auth console from source with HMR (${packagePath}).`);

    return {
        path: basePath,
        app: compose(dev, await setupConsoleApplication(
            createConsoleApplication<AuthConsoleConfig>({
                config,
                listen: false,
                createHandler: (resolved, theme) => createAuthConsoleHandler(resolved, theme, dev.render),
            }),
            registerApplication,
        )),
    };
}
