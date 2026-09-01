/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';
import { defineCommand } from 'citty';
import type { ConfigReadFsOptions } from '@authup/server-config';
import {
    ConfigModule,
    HTTPModule,
    createApplication,
    readConfig,
    registerShutdownHandlers,
} from '@authup/server-core';
import type { ConsoleConfigs } from '../roles/config.ts';
import { readConsoleConfigs } from '../roles/config.ts';
import { createApplication as createAuthConsoleApplication } from '@authup/server-auth-console';
import { createApplication as createAdminConsoleApplication } from '@authup/server-admin-console';
import { createApplication as createAccountConsoleApplication } from '@authup/server-account-console';
import { InjectionKey } from '@authup/server-console-kit';
import type { Application } from 'orkos';

/**
 * The single-container composition (plan 101 D2): every enabled console on
 * server-core's own listener.
 *
 * Each console is set up as the APPLICATION it is, with `listen: false`, and
 * what gets mounted is the app its own graph built. The alternative -- asking
 * each console for a bare handler -- would run neither its config module nor
 * its theme module, so `authup start` would be a third way to start a console
 * that only resembles the two supported ones. A console owns its listener
 * everywhere except here, and here it is composed rather than reduced.
 *
 * The mount PATH is the path component of the console's url, never the url
 * itself. A console url is where a BROWSER reaches the console, so it carries
 * the origin the proxy publishes; the listener only ever sees the path.
 */
async function buildConsoleApplications(consoles: ConsoleConfigs) : Promise<{
    path: string,
    application: Application,
}[]> {
    const candidates : {
        name: string,
        url: string,
        create: () => Application
    }[] = [
        // The auth console is not gated. The hosted login, consent and
        // workflow pages are the issuance surface, so no flag turns them off
        // (plan 099).
        {
            name: 'auth console',
            url: consoles.auth.url,
            create: () => createAuthConsoleApplication({ config: consoles.auth, listen: false }),
        },
    ];

    if (consoles.admin.enabled) {
        candidates.push({
            name: 'admin console',
            url: consoles.admin.url,
            create: () => createAdminConsoleApplication({ config: consoles.admin, listen: false }),
        });
    }

    if (consoles.account.enabled) {
        candidates.push({
            name: 'account console',
            url: consoles.account.url,
            create: () => createAccountConsoleApplication({ config: consoles.account, listen: false }),
        });
    }

    const applications : { path: string, application: Application }[] = [];

    for (const candidate of candidates) {
        const path = getURLBasePath(candidate.url);
        if (!path) {
            // A console with no path of its own would have to own the API's
            // root, where it would shadow the protocol routes and the page
            // GETs would redirect to themselves. Refuse it by name rather
            // than booting into a redirect loop. The origin needs no check
            // here: every console url is already refused unless it is
            // publicUrl's own origin, by the key that resolves it.
            throw new AuthupError(
                `The ${candidate.name} url is ${candidate.url}, which is this deployment's own origin root. ` +
                'A console needs a path of its own; the defaults are under /console.',
            );
        }

        const application = candidate.create();

        await application.setup();

        applications.push({ path, application });
    }

    return applications;
}

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
 * redirect, because that is a controller reading `server.<name>Console.url`,
 * not a mount.
 *
 * Two named factories rather than one with a flag: the role is what an
 * operator types, `meta.name` has to match it for `--help`, and a boolean
 * argument at the registration site would say nothing about which role it
 * selects.
 */
function defineApplicationCommand(
    configFs: ConfigReadFsOptions,
    role: { name: string, consoles: boolean },
) {
    return defineCommand({
        meta: { name: role.name },
        async setup() {
            const config = await readConfig({
                env: true,
                fs: { ...configFs },
            });

            const consoles : { path: string, application: Application }[] = [];

            const app = createApplication({
                config: new ConfigModule(config),
                http: new HTTPModule({
                    mount: async (router) => {
                        if (!role.consoles) {
                            return;
                        }

                        consoles.push(...await buildConsoleApplications(
                            await readConsoleConfigs(configFs),
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

export function defineCLIStartCommand(configFs: ConfigReadFsOptions = {}) {
    return defineApplicationCommand(configFs, { name: 'start', consoles: true });
}

export function defineCLICoreCommand(configFs: ConfigReadFsOptions = {}) {
    return defineApplicationCommand(configFs, { name: 'core', consoles: false });
}
