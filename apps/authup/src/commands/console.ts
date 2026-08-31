/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { createAccountConsoleApplication } from '@authup/server-account-console';
import { createAdminConsoleApplication } from '@authup/server-admin-console';
import { createAuthConsoleApplication } from '@authup/server-auth-console';
import { InjectionKey } from '@authup/server-console-kit';
import type { Application } from 'orkos';
import type { ConfigReadFsOptions } from '@authup/server-config';
import { registerShutdownHandlers } from '@authup/server-core';
import { defineCommand } from 'citty';
import { readConsoleConfigs } from '../roles/config.ts';

const CONSOLE_NAMES = ['admin', 'account', 'auth'] as const;

type ConsoleName = typeof CONSOLE_NAMES[number];

type ConsoleService = {
    name: ConsoleName,
    create: () => Application,
};

/**
 * Run the serving service for one console, or for every enabled one.
 *
 * Each console listens on its own port, because each IS its own service: the
 * package, the config section and the deployment are per console (plan 101
 * resolved question 8), so a shared listener would be the one place that
 * pretends otherwise. Behind one origin the proxy routes each console's path
 * to its port; the alternative single-container shape is `authup start`,
 * which composes them onto server-core's listener instead.
 */
export function defineCLIConsoleCommand(configFs: ConfigReadFsOptions = {}) {
    return defineCommand({
        meta: {
            name: 'console',
            description: 'Serve a console. Without a name, every enabled console is served on its own port.',
        },
        args: {
            name: {
                type: 'positional',
                required: false,
                options: [...CONSOLE_NAMES],
                valueHint: CONSOLE_NAMES.join('|'),
                description: 'The console to serve.',
            },
        },
        async setup(context) {
            const selected = context.args.name as ConsoleName | undefined;

            // Nothing of server-core's: every value a console needs is declared
            // on its own key and resolved from the document, so this reads the
            // same file a console's own bin would.
            const consoles = await readConsoleConfigs(configFs);

            const services : ConsoleService[] = [
                {
                    name: 'auth',
                    create: () => createAuthConsoleApplication(consoles.auth),
                },
            ];

            if (consoles.admin.enabled) {
                services.push({
                    name: 'admin',
                    create: () => createAdminConsoleApplication(consoles.admin),
                });
            }

            if (consoles.account.enabled) {
                services.push({
                    name: 'account',
                    create: () => createAccountConsoleApplication(consoles.account),
                });
            }

            const wanted = selected ?
                services.filter((service) => service.name === selected) :
                services;

            if (wanted.length === 0) {
                // A named console that is switched off is an operator
                // contradiction, and starting nothing would read as a healthy
                // run to whatever supervises the process.
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
        },
    });
}
