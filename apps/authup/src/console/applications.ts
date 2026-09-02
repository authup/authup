/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createApplication as createAccountConsoleApplication } from '@authup/server-account-console';
import { createApplication as createAdminConsoleApplication } from '@authup/server-admin-console';
import { createApplication as createAuthConsoleApplication } from '@authup/server-auth-console';
import type { Application } from 'orkos';
import { assertConsolePath } from './path.ts';
import type { ConsoleApplication, ConsoleConfigs } from './types.ts';

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
 * The mount PATH is derived from the console's url, never the url itself, and
 * never the whole path either. A console url is where a BROWSER reaches the
 * console, so it carries both the origin the proxy publishes and the path
 * prefix authup is published under; the listener sees neither, because the
 * proxy strips the prefix before the request arrives. `assertConsolePath`
 * takes publicUrl for exactly that subtraction.
 */
export async function buildConsoleApplications(
    consoles: ConsoleConfigs,
    publicUrl: string,
) : Promise<ConsoleApplication[]> {
    const candidates : {
        name: string,
        url: string,
        create: () => Application
    }[] = [
        // The auth console is not gated. The hosted login, consent and
        // workflow pages are the issuance surface, so no flag turns them off
        // (plan 099).
        {
            name: 'auth',
            url: consoles.auth.url,
            create: () => createAuthConsoleApplication({ config: consoles.auth, listen: false }),
        },
    ];

    if (consoles.admin.enabled) {
        candidates.push({
            name: 'admin',
            url: consoles.admin.url,
            create: () => createAdminConsoleApplication({ config: consoles.admin, listen: false }),
        });
    }

    if (consoles.account.enabled) {
        candidates.push({
            name: 'account',
            url: consoles.account.url,
            create: () => createAccountConsoleApplication({ config: consoles.account, listen: false }),
        });
    }

    const applications : ConsoleApplication[] = [];

    for (const candidate of candidates) {
        const path = assertConsolePath(candidate.name, candidate.url, publicUrl);

        const application = candidate.create();

        await application.setup();

        applications.push({ path, application });
    }

    return applications;
}
