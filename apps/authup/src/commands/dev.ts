/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

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
import type { ConfigReadFsOptions } from '@authup/server-config';
import {
    ConfigModule,
    HTTPModule,
    createApplication,
    readConfig,
    registerShutdownHandlers,
} from '@authup/server-core';
import { defineCommand } from 'citty';
import { assertConsolePath, readConsoleConfigs } from '../console/index.ts';
import type { Mount } from '../dev/index.ts';
import {
    HMR_PORTS,
    assertNotProduction,
    buildAuthMount,
    buildStaticMount,
    withConsoleRateLimitSkip,
} from '../dev/index.ts';

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

            const consoles = await readConsoleConfigs(configFs);

            // Resolved here rather than inside each builder so the mounts and
            // the rate-limit exemption below cannot disagree about where a
            // console lives, and read BEFORE the application is built because
            // the exemption has to be on the config by the time server-core
            // registers the middleware.
            const authPath = assertConsolePath('auth', consoles.auth.url);
            const adminPath = consoles.admin.enabled ?
                assertConsolePath('admin', consoles.admin.url) :
                undefined;
            const accountPath = consoles.account.enabled ?
                assertConsolePath('account', consoles.account.url) :
                undefined;

            config.middlewareRateLimit = withConsoleRateLimitSkip(
                config.middlewareRateLimit,
                [authPath, adminPath, accountPath]
                    .filter((value) : value is string => typeof value === 'string'),
            );

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
                        mounts.push(await buildAuthMount(consoles.auth, authPath, log, register));

                        // Each handler is bound at its own call site rather
                        // than passed as a value: the three services take
                        // three different config types, so a shared factory
                        // parameter would have to widen them into a union the
                        // callee could not hand back.
                        if (adminPath) {
                            mounts.push(await buildStaticMount({
                                name: 'admin',
                                basePath: adminPath,
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

                        if (accountPath) {
                            mounts.push(await buildStaticMount({
                                name: 'account',
                                basePath: accountPath,
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
