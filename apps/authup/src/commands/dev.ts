/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { EnvironmentName, getURLBasePath } from '@authup/kit';
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
    createOpenInEditorGuard,
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
};

/**
 * `authup dev` must never run a production deployment, and the refusal has to
 * be here rather than left to the detection rule.
 *
 * The shipped container is what makes it reachable: its Dockerfile runs
 * `COPY . .` and `npm ci` BEFORE `ENV NODE_ENV=production` and prunes
 * nothing, so every `vite.config.ts` is present and every devDependency is
 * installed, which is exactly the state `isSourceCheckout` reports as a
 * source checkout. `entrypoint.sh` passes any command straight through while
 * exporting `HOST=0.0.0.0`. So a production image started with `dev` would
 * put a vite dev server, a file watcher and an unauthenticated `/@fs/`
 * reader on a public port, over the real database and the real signing keys.
 *
 * The environment read is server-core's own notion (`config.env`, the `env`
 * key backed by `NODE_ENV`), never `process.env` directly, so an operator who
 * declares the environment in `authup.yml` is covered by the same gate.
 */
function assertNotProduction(env: string) : void {
    if (env === EnvironmentName.PRODUCTION) {
        throw new AuthupError(
            'The dev command refuses to run with env set to production: it starts a vite dev server ' +
            'with a file watcher and a filesystem reader over this deployment\'s own configuration, ' +
            'database and signing keys. Run `authup start` instead.',
        );
    }
}

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
 *
 * The guard is registered BEFORE the vite middlewares, which is the whole
 * point of it: vite mounts a process-spawning endpoint unconditionally, and
 * this listener is reachable from off the machine. See
 * `createOpenInEditorGuard`.
 */
function compose(dev: ConsoleDevServer | undefined, handler: IApp) : IApp {
    if (!dev) {
        return handler;
    }

    const app = new App();
    app.use(createOpenInEditorGuard());
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
    register: (close: () => Promise<void>) => void,
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
        app: compose(dev, await options.createHandler(dev.readShell)),
    };
}

async function buildAuthMount(
    config: AuthConsoleConfig,
    log: (message: string) => void,
    register: (close: () => Promise<void>) => void,
) : Promise<Mount> {
    const basePath = assertConsolePath('auth', config.url);
    const packagePath = resolveAuthConsolePackagePath(config.distPath);

    if (!isSourceCheckout(packagePath)) {
        log(`Serving the auth console from its built bundle (no source checkout at ${packagePath ?? 'an unresolved path'}).`);

        return { path: basePath, app: await createAuthConsoleHandler(config) };
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
        app: compose(dev, await createAuthConsoleHandler(config, undefined, dev.render)),
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

            assertNotProduction(config.env);

            // eslint-disable-next-line no-console
            const log = (message: string) => console.log(message);

            const mounts : Mount[] = [];

            // Collected separately from the mounts, and appended to the
            // moment a dev server exists rather than when its mount is
            // complete: a console that fails to build its handler would
            // otherwise strand the watcher and the websocket of every dev
            // server started before it.
            const closers : Array<() => Promise<void>> = [];
            const register = (close: () => Promise<void>) => {
                closers.push(close);
            };

            // One failing close must not abandon the rest, so the results are
            // settled rather than raced.
            const closeDevServers = async () => {
                await Promise.allSettled(closers.map((close) => close()));
            };

            const app = createApplication({
                config: new ConfigModule(config),
                http: new HTTPModule({
                    mount: async (router) => {
                        const consoles = await readConsoleConfigs(configFs);

                        mounts.push(await buildAuthMount(consoles.auth, log, register));

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
                                register,
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
                                register,
                            }));
                        }

                        for (const mount of mounts) {
                            router.use(mount.path, mount.app);
                        }
                    },
                }),
            });

            try {
                await app.setup();
            } catch (e) {
                // Whatever failed, the dev servers already started are ours
                // to close before the error leaves this command.
                await closeDevServers();

                throw e;
            }

            registerShutdownHandlers({
                teardown: async () => {
                    // The dev servers first: each owns a file watcher and an
                    // HMR websocket, which outlive the http listener.
                    await closeDevServers();

                    await app.teardown();
                },
            });
        },
    });
}
