/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { defineCommand } from 'citty';
import type { ConfigReadFsOptions } from '@authup/server-config';
import {
    ConfigModule,
    HTTPModule,
    createApplication,
    createWorkerApplication,
    readConfig,
    registerShutdownHandlers,
} from '@authup/server-core';
import { InjectionKey } from '@authup/server-console-kit';
import type { ConsoleApplication } from '../console/index.ts';
import { buildConsoleApplications, readConsoleConfigs } from '../console/index.ts';

/**
 * The two roles that run server-core in this process, differing only in what
 * rides its listener.
 *
 * `start` is the batteries-included single container: server-core plus every
 * enabled console. `core` is the API and the IdP alone, the API half of a
 * split deployment, where the consoles are their own processes behind
 * `authup console` and the proxy routes `/console/**` to them. So `core`
 * reads no console configuration at all: it neither resolves a console
 * package nor loads an operator theme, and every console path answers the
 * 404 server-core has served since plan 101 D2-3. The hosted page GETs still
 * redirect, because that is a controller reading `<name>Console.url`,
 * not a mount.
 *
 * Two named factories rather than one with a flag: the role is what an
 * operator types, `meta.name` has to match it for `--help`, and a boolean
 * argument at the registration site would say nothing about which role it
 * selects.
 */
export function defineApplicationCommand(
    configFs: ConfigReadFsOptions,
    role: {
        name: string, 
        description: string, 
        consoles: boolean 
    },
) {
    return defineCommand({
        meta: { name: role.name, description: role.description },
        args: {
            worker: {
                type: 'boolean',
                default: false,
                description: 'Run the background worker alone, with no listener; refuses to start while core.worker.enabled is false. Without it the API runs the worker alongside itself while that key is true.',
            },
        },
        async setup(context) {
            const config = await readConfig({
                env: true,
                fs: { ...configFs },
            });

            if (context.args.worker) {
                const worker = createWorkerApplication({ config: new ConfigModule(config) });
                await worker.setup();
                registerShutdownHandlers(worker);
                return;
            }

            const consoles : ConsoleApplication[] = [];

            const app = createApplication({
                config: new ConfigModule(config),
                http: new HTTPModule({
                    mount: async (router) => {
                        if (!role.consoles) {
                            return;
                        }

                        consoles.push(...await buildConsoleApplications(
                            await readConsoleConfigs(configFs),
                            config.publicUrl,
                        ));

                        for (const mount of consoles) {
                            router.use(
                                mount.path,
                                mount.application.container.resolve(InjectionKey.App),
                            );
                        }
                    },
                }),
            });

            await app.setup();

            registerShutdownHandlers({
                teardown: async () => {
                    // The consoles first: they are mounted ON this listener,
                    // so tearing the listener down under them would leave
                    // their modules to unwind against a socket that is gone.
                    await Promise.all(consoles.map((mount) => mount.application.teardown()));

                    await app.teardown();
                },
            });
        },
    });
}
