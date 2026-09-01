/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';
import {
    CONFIG_MARKER as ACCOUNT_CONFIG_MARKER,
    PACKAGE_NAME as ACCOUNT_PACKAGE_NAME,
    VITE_BASE as ACCOUNT_VITE_BASE,
    createHandler as createAccountConsoleHandler,
} from '@authup/server-account-console';
import {
    CONFIG_MARKER as ADMIN_CONFIG_MARKER,
    PACKAGE_NAME as ADMIN_PACKAGE_NAME,
    VITE_BASE as ADMIN_VITE_BASE,
    createHandler as createAdminConsoleHandler,
} from '@authup/server-admin-console';
import type { Config as AuthConsoleConfig } from '@authup/server-auth-console';
import { createHandler as createAuthConsoleHandler } from '@authup/server-auth-console';
import { defineStaticConsole } from '@authup/server-console-kit';
import type { ConfigReadFsOptions } from '@authup/server-config';
import {
    ConfigModule,
    HTTPModule,
    createApplication,
    readConfig,
    registerShutdownHandlers,
} from '@authup/server-core';
import { defineCommand } from 'citty';
import type { IApp, IAppEvent } from 'routup';
import { App } from 'routup';
import { fromNodeMiddleware } from 'routup/node';
import type { ConsoleDevServer } from '../dev/index.ts';
import {
    createAuthConsoleDevServer,
    createStaticConsoleDevServer,
    isSourceCheckout,
    resolveAuthConsolePackagePath,
} from '../dev/index.ts';
import { PACKAGE_PATH } from '../path.ts';
import { readConsoleConfigs } from '../roles/config.ts';

/**
 * One websocket per dev server. Middleware mode cannot share the listener:
 * the console mounts are built inside server-core's `mount` hook, which fires
 * before the http server exists.
 */
const HMR_PORTS = {
    auth: 24678,
    admin: 24679,
    account: 24680,
} as const;

type Mount = {
    path: string,
    app: IApp,
    close?: () => Promise<void>,
};

function assertConsolePath(name: string, url: string) : string {
    const value = getURLBasePath(url);
    if (!value) {
        throw new AuthupError(
            `The ${name} console url is ${url}, which is this deployment's own origin root. ` +
            'A console needs a path of its own; the defaults are under /console.',
        );
    }

    return value;
}

/**
 * Wrap a console handler so a dev server sits in FRONT of it: vite answers
 * its client, its source modules and its dependency chunks, and everything it
 * declines falls through to the console's own routes.
 */
function compose(dev: ConsoleDevServer | undefined, handler: IApp) : IApp {
    if (!dev) {
        return handler;
    }

    const app = new App();
    app.use(fromNodeMiddleware(dev.middlewares));
    app.use(handler);

    return app;
}

async function buildStaticMount(options: {
    name: 'admin' | 'account',
    url: string,
    distPath: string,
    packageName: string,
    marker: string,
    viteBase: string,
    hmrPort: number,
    createHandler: (readShell?: (event: IAppEvent) => Promise<string>) => Promise<IApp>,
    log: (message: string) => void,
}) : Promise<Mount> {
    const basePath = assertConsolePath(options.name, options.url);

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

        return { path: basePath, app: await options.createHandler() };
    }

    options.log(`Serving the ${options.name} console from source with HMR (${packagePath}).`);

    const dev = await createStaticConsoleDevServer({
        packageName: options.packageName,
        root: packagePath,
        basePath,
        hmrPort: options.hmrPort,
    });

    return {
        path: basePath,
        app: compose(dev, await options.createHandler(dev.readShell)),
        close: dev.close,
    };
}

async function buildAuthMount(
    config: AuthConsoleConfig,
    log: (message: string) => void,
) : Promise<Mount> {
    const basePath = assertConsolePath('auth', config.url);
    const packagePath = resolveAuthConsolePackagePath(config.distPath);

    if (!isSourceCheckout(packagePath)) {
        log(`Serving the auth console from its built bundle (no source checkout at ${packagePath ?? 'an unresolved path'}).`);

        return { path: basePath, app: await createAuthConsoleHandler(config) };
    }

    log(`Serving the auth console from source with HMR (${packagePath}).`);

    const dev = await createAuthConsoleDevServer({
        packageName: '@authup/client-auth-console',
        root: packagePath,
        basePath,
        hmrPort: HMR_PORTS.auth,
    });

    return {
        path: basePath,
        app: compose(dev, await createAuthConsoleHandler(config, undefined, dev.render)),
        close: dev.close,
    };
}

/**
 * EXPERIMENTAL. `authup start` with one difference: every console whose
 * package resolves to a SOURCE checkout is served through a vite dev server
 * with hot module replacement, instead of from its built `dist/`.
 *
 * Nothing about the composition changes. The consoles still mount through
 * server-core's own `mount` hook, so a console's wildcard shell route still
 * lands after the protocol routes and before the error middleware, and each
 * console still serves its shell through its own handler, so the operator
 * theme, the account console's request-reflected `ref` and the console
 * security headers are all the ones production uses.
 *
 * There is no configuration key for any of it: a published console package
 * ships `files: ["dist"]` and therefore carries no vite config, while a
 * workspace symlink and a substituted checkout both do.
 *
 * Running server-core itself from TypeScript is a WORKSPACE capability, not
 * this command's: it comes from the `authup-source` export condition, which a
 * published install cannot satisfy because it ships no source.
 */
export function defineCLIDevCommand(configFs: ConfigReadFsOptions = {}) {
    return defineCommand({
        meta: {
            name: 'dev',
            description: 'EXPERIMENTAL. Serve like `start`, with hot module replacement for every console available as source.',
        },
        async setup() {
            const config = await readConfig({ env: true, fs: { ...configFs } });

            // eslint-disable-next-line no-console
            const log = (message: string) => console.log(message);

            const mounts : Mount[] = [];

            const app = createApplication({
                config: new ConfigModule(config),
                http: new HTTPModule({
                    mount: async (router) => {
                        const consoles = await readConsoleConfigs(configFs);

                        mounts.push(await buildAuthMount(consoles.auth, log));

                        // Each handler is bound at its own call site rather
                        // than passed as a value: the three services take
                        // three different config types, so a shared factory
                        // parameter would have to widen them into a union the
                        // callee could not hand back.
                        if (consoles.admin.enabled) {
                            mounts.push(await buildStaticMount({
                                name: 'admin',
                                url: consoles.admin.url,
                                distPath: consoles.admin.distPath,
                                packageName: ADMIN_PACKAGE_NAME,
                                marker: ADMIN_CONFIG_MARKER,
                                viteBase: ADMIN_VITE_BASE,
                                hmrPort: HMR_PORTS.admin,
                                createHandler: (readShell) => createAdminConsoleHandler(
                                    consoles.admin,
                                    undefined,
                                    readShell,
                                ),
                                log,
                            }));
                        }

                        if (consoles.account.enabled) {
                            mounts.push(await buildStaticMount({
                                name: 'account',
                                url: consoles.account.url,
                                distPath: consoles.account.distPath,
                                packageName: ACCOUNT_PACKAGE_NAME,
                                marker: ACCOUNT_CONFIG_MARKER,
                                viteBase: ACCOUNT_VITE_BASE,
                                hmrPort: HMR_PORTS.account,
                                createHandler: (readShell) => createAccountConsoleHandler(
                                    consoles.account,
                                    undefined,
                                    readShell,
                                ),
                                log,
                            }));
                        }

                        for (const mount of mounts) {
                            router.use(mount.path, mount.app);
                        }
                    },
                }),
            });

            await app.setup();

            registerShutdownHandlers({
                teardown: async () => {
                    // The dev servers first: each owns a file watcher and an
                    // HMR websocket, which outlive the http listener.
                    await Promise.all(mounts.map((mount) => mount.close?.()));

                    await app.teardown();
                },
            });
        },
    });
}
