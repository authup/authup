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
import type { ApplicationMount } from '@authup/server-core';
import {
    ConfigModule,
    HTTPModule,
    createApplication,
    readConfig,
    registerShutdownHandlers,
} from '@authup/server-core';
import type { ConsoleConfigs } from '../roles/config.ts';
import { readConsoleConfigs } from '../roles/config.ts';
import { createAuthConsoleHandler } from '@authup/server-auth-console';
import { createAdminConsoleHandler } from '@authup/server-admin-console';
import { createAccountConsoleHandler } from '@authup/server-account-console';

/**
 * The single-container composition (plan 101 D2): every enabled console on
 * server-core's own listener.
 *
 * The mount PATH is the path component of the console's url, never the url
 * itself. A console url is where a BROWSER reaches the console, so it carries
 * the origin the proxy publishes; the listener only ever sees the path.
 *
 * The list is handed to {@link HTTPModule} rather than mounted afterwards,
 * because the order relative to the protocol routes and the trailing
 * middleware is load-bearing and belongs to the module that owns them.
 */
async function buildConsoleMounts(consoles: ConsoleConfigs) : Promise<ApplicationMount[]> {
    const candidates : {
        name: string, 
        url: string, 
        create: () => Promise<ApplicationMount['handler']> 
    }[] = [
        // The auth console is not gated. The hosted login, consent and
        // workflow pages are the issuance surface, so no flag turns them off
        // (plan 099).
        {
            name: 'auth console',
            url: consoles.auth.url,
            create: () => createAuthConsoleHandler(consoles.auth),
        },
    ];

    if (consoles.admin.enabled) {
        candidates.push({
            name: 'admin console',
            url: consoles.admin.url,
            create: () => createAdminConsoleHandler(consoles.admin),
        });
    }

    if (consoles.account.enabled) {
        candidates.push({
            name: 'account console',
            url: consoles.account.url,
            create: () => createAccountConsoleHandler(consoles.account),
        });
    }

    const mounts : ApplicationMount[] = [];

    for (const candidate of candidates) {
        const path = getURLBasePath(candidate.url);
        if (!path) {
            // A console with no path of its own would have to own the API's
            // root, where it would shadow the protocol routes and the page
            // GETs would redirect to themselves. Refuse it by name rather
            // than booting into a redirect loop. The origin needs no check
            // here: normalizeConfig already refused a console url that is not
            // publicUrl's own origin.
            throw new AuthupError(
                `The ${candidate.name} url is ${candidate.url}, which is this deployment's own origin root. ` +
                'A console needs a path of its own; the defaults are under /console.',
            );
        }

        mounts.push({ path, handler: await candidate.create() });
    }

    return mounts;
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

            let mounts : ApplicationMount[] = [];
            if (role.consoles) {
                // The consoles read the same document through their own
                // registries, but the values normalizeConfig derives
                // (publicUrl, the canonicalized trusted origins, an absolute
                // rootPath) are products of this read, so it is handed over
                // rather than redone.
                mounts = await buildConsoleMounts(await readConsoleConfigs(configFs, config));
            }

            const app = createApplication({
                config: new ConfigModule(config),
                http: new HTTPModule({ mounts }),
            });

            await app.setup();

            registerShutdownHandlers(app);
        },
    });
}

export function defineCLIStartCommand(configFs: ConfigReadFsOptions = {}) {
    return defineApplicationCommand(configFs, { name: 'start', consoles: true });
}

export function defineCLICoreCommand(configFs: ConfigReadFsOptions = {}) {
    return defineApplicationCommand(configFs, { name: 'core', consoles: false });
}
