/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApplication as createAccountConsoleApplication } from '@authup/server-account-console';
import { createApplication as createAdminConsoleApplication } from '@authup/server-admin-console';
import { createApplication as createAuthConsoleApplication } from '@authup/server-auth-console';
import type { ConfigReadFsOptions } from '@authup/server-config';
import { InjectionKey } from '@authup/server-console-kit';
import {
    CLI_CONFIG_ARGS,
    ConfigModule,
    HTTPModule,
    createApplication,
    createWorkerApplication,
    readConfig,
    registerShutdownHandlers,
} from '@authup/server-core';
import { defineCommand } from 'citty';
import type { Application } from 'orkos';
import type { ConsoleApplication } from '../console/index.ts';
import { buildConsoleApplications, readConsoleConfigs } from '../console/index.ts';

const ROLES = ['core', 'worker', 'console'] as const;
const CONSOLE_NAMES = ['admin', 'account', 'auth'] as const;

type Role = typeof ROLES[number];
type ConsoleName = typeof CONSOLE_NAMES[number];

function isRole(value: string) : value is Role {
    return (ROLES as readonly string[]).includes(value);
}

function isConsoleName(value: string) : value is ConsoleName {
    return (CONSOLE_NAMES as readonly string[]).includes(value);
}

/**
 * One command, four process shapes, told apart by a positional ROLE:
 *
 * - none:    server-core plus every enabled console on one listener, the
 *            batteries-included single container
 * - core:    the API and the IdP alone. It reads no console configuration at
 *            all, resolves no console package and loads no theme; every
 *            console path answers the 404 server-core has served since plan
 *            101 D2-3, and the hosted page GETs still redirect because that
 *            is a controller reading `<name>Console.url`, not a mount
 * - worker:  the background sweeps alone: no listener, no migrations, and a
 *            refusal at boot while `core.worker.enabled` is false
 * - console: one console service, or every enabled one, each on its own port
 *
 * citty validates neither positional (a positional's `options` are
 * decorative), and it parses undeclared flags as booleans nobody reads, so
 * the vocabulary, the arity and the retired `--worker` flag are all refused
 * by hand here, before any configuration is read: a mis-typed role must never
 * fall through to the composed default and start the wrong process.
 *
 * The config flags are declared on this command as well as on the root, which
 * still reads them first: the subcommand is re-parsed with only its own arg
 * defs, so a space-separated `--configDirectory /x` after the role would
 * otherwise be read as the next positional.
 */
export function defineCLIStartCommand(configFs: ConfigReadFsOptions = {}) {
    return defineCommand({
        meta: {
            name: 'start',
            description: 'Start authup. Without a role: the API and every enabled console on one listener.',
        },
        args: {
            role: {
                type: 'positional',
                required: false,
                valueHint: ROLES.join('|'),
                description: 'core: the API alone. worker: the background sweeps alone. console: the console services alone.',
            },
            name: {
                type: 'positional',
                required: false,
                valueHint: CONSOLE_NAMES.join('|'),
                description: 'With the console role: the one console to serve.',
            },
            worker: {
                type: 'boolean',
                description: 'Retired. Use `authup start worker`.',
            },
            ...CLI_CONFIG_ARGS,
        },
        async setup(context) {
            if (context.args.worker) {
                throw new Error('The --worker flag is retired. Use `authup start worker`.');
            }

            const { role, name } = context.args;

            if (role !== undefined && !isRole(role)) {
                throw new Error(`Unknown role "${role}". Expected one of: ${ROLES.join(', ')}.`);
            }

            if (name !== undefined && role !== 'console') {
                throw new Error(`Unexpected argument "${name}": only the console role takes a name.`);
            }

            if (name !== undefined && !isConsoleName(name)) {
                throw new Error(`Unknown console "${name}". Expected one of: ${CONSOLE_NAMES.join(', ')}.`);
            }

            if (context.args._.length > 2) {
                throw new Error(`Unexpected argument "${context.args._[2]}" for command "start".`);
            }

            if (role === 'console') {
                await startConsoles(configFs, name);
                return;
            }

            const config = await readConfig({ env: true, fs: { ...configFs } });

            if (role === 'worker') {
                const worker = createWorkerApplication({ config: new ConfigModule(config) });
                await worker.setup();
                registerShutdownHandlers(worker);
                return;
            }

            const consoles : ConsoleApplication[] = [];

            const app = createApplication({
                config: new ConfigModule(config),
                http: new HTTPModule({
                    // The consoles land through server-core's own mount hook
                    // rather than on the resolved app afterwards: after the
                    // controllers, so a console's wildcard shell route cannot
                    // shadow a protocol route, and before the error middleware
                    // and the listener, so they inherit the error handling and
                    // are in place before anything is accepted.
                    mount: async (router) => {
                        if (role === 'core') {
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

/**
 * Each console listens on its own port, because each IS its own service: the
 * package, the config section and the deployment are per console (plan 101
 * resolved question 8), so a shared listener would be the one place that
 * pretends otherwise. Behind one origin the proxy routes each console's path
 * to its port; the single-container shape is the role-less `start`, which
 * composes them onto server-core's listener instead.
 *
 * Nothing of server-core's is read: every value a console needs is declared
 * on its own key and resolved from the document, so this reads the same file
 * a console's own bin would.
 */
async function startConsoles(configFs: ConfigReadFsOptions, selected?: ConsoleName) : Promise<void> {
    const consoles = await readConsoleConfigs(configFs);

    const services : { name: ConsoleName, create: () => Application }[] = [
        {
            name: 'auth',
            create: () => createAuthConsoleApplication({ config: consoles.auth }),
        },
    ];

    if (consoles.admin.enabled) {
        services.push({
            name: 'admin',
            create: () => createAdminConsoleApplication({ config: consoles.admin }),
        });
    }

    if (consoles.account.enabled) {
        services.push({
            name: 'account',
            create: () => createAccountConsoleApplication({ config: consoles.account }),
        });
    }

    const wanted = selected ?
        services.filter((service) => service.name === selected) :
        services;

    if (wanted.length === 0) {
        // A named console that is switched off is an operator contradiction,
        // and starting nothing would read as a healthy run to whatever
        // supervises the process.
        throw new Error(`The ${selected} console is disabled, so there is nothing to serve.`);
    }

    const applications : Application[] = [];
    for (const service of wanted) {
        const application = service.create();

        await application.setup();

        applications.push(application);

        const server = application.container.resolve(InjectionKey.Server);

        // eslint-disable-next-line no-console
        console.log(`Serving the ${service.name} console on ${server.url}`);
    }

    registerShutdownHandlers({
        teardown: async () => {
            await Promise.all(applications.map((application) => application.teardown()));
        },
    });
}
