/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import { createAccountConsoleServer } from '@authup/server-account-console';
import { createAdminConsoleServer } from '@authup/server-admin-console';
import { createAuthConsoleServer } from '@authup/server-auth-console';
import type { ConfigReadFsOptions } from '@authup/server-config';
import { readConfig, registerShutdownHandlers } from '@authup/server-core';
import { defineCommand } from 'citty';
import type { IApp } from 'routup';
import { serve } from 'routup/node';
import { readConsoleConfigs } from '../roles/config.ts';

const CONSOLE_NAMES = ['admin', 'account', 'auth'] as const;

type ConsoleName = typeof CONSOLE_NAMES[number];

type ConsoleService = {
    name: ConsoleName,
    port: number,
    host: string,
    create: () => Promise<IApp>,
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

            // The consoles read `authup.yml` through their own registries,
            // but three values are products of server-core's normalization
            // rather than of any key (a derived publicUrl, the canonicalized
            // trusted origins, an absolute rootPath), so the core
            // configuration is read here too. It is the same document, and
            // normalizing it is also where the cross-section invariants live:
            // a console url on another origin is refused here rather than
            // half-working at runtime.
            const core = await readConfig({ env: true, fs: { ...configFs } });
            const consoles = await readConsoleConfigs(configFs, core);

            const services : ConsoleService[] = [
                {
                    name: 'auth',
                    port: consoles.auth.port,
                    host: consoles.auth.host,
                    create: () => createAuthConsoleServer(consoles.auth),
                },
            ];

            if (consoles.admin.enabled) {
                services.push({
                    name: 'admin',
                    port: consoles.admin.port,
                    host: consoles.admin.host,
                    create: () => createAdminConsoleServer(consoles.admin),
                });
            }

            if (consoles.account.enabled) {
                services.push({
                    name: 'account',
                    port: consoles.account.port,
                    host: consoles.account.host,
                    create: () => createAccountConsoleServer(consoles.account),
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

            const servers : ReturnType<typeof serve>[] = [];
            for (const service of wanted) {
                const server = serve(await service.create(), {
                    port: service.port,
                    hostname: service.host,
                    silent: true,
                });

                await server.ready();

                servers.push(server);

                // eslint-disable-next-line no-console
                console.log(`Serving the ${service.name} console on ${server.url}`);
            }

            registerShutdownHandlers({
                teardown: async () => {
                    // `true` closes active connections. A console serves
                    // documents and assets over keep-alive sockets, so
                    // waiting for them to go idle means waiting out the
                    // client's own timeout: a container stop would sit at
                    // the force-exit deadline every time.
                    await Promise.all(servers.map((server) => server.close(true)));
                },
            });
        },
    });
}
