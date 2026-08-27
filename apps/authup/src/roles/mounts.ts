/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';
import { createAccountConsoleHandler } from '@authup/server-account-console';
import { createAdminConsoleHandler } from '@authup/server-admin-console';
import { createAuthConsoleHandler } from '@authup/server-auth-console';
import type {
    ApplicationMount,
    ApplicationMountFactory,
    Config,
    ConfigReadFsOptions,
} from '@authup/server-core';
import type { IApp } from 'routup';
import { readConsoleConfigs } from './config.ts';

type ConsoleMount = {
    name: string,
    url: string,
    create: () => Promise<IApp>,
};

/**
 * The monolith composition (plan 101 D2).
 *
 * `authup start` is the single-container experience, so it has to serve
 * the consoles as well as the API. server-core does not know they exist:
 * it exposes a generic `mounts` seam and this layer, which knows about
 * every piece, hands it opaque handlers. A controller for a console
 * appearing inside `apps/authup` would be the smell that composition
 * leaked the wrong way; handlers live in the packages that own them.
 *
 * A split deployment runs `authup core` (which mounts nothing) next to
 * `authup console <name>` behind their own listeners, with the proxy
 * routing `/console/**` to them. The page GETs redirect either way, so a
 * misrouted request is harmless.
 */
export function buildApplicationMounts(options: ConfigReadFsOptions) : ApplicationMountFactory {
    return async (config: Config) => {
        const consoles = await readConsoleConfigs(options, config);

        const candidates : ConsoleMount[] = [
            // The auth console is not gated. The hosted login, consent and
            // workflow pages are the issuance surface, so no flag turns them
            // off (plan 099).
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
            // Only a console on THIS origin can be mounted here. A url
            // pointing somewhere else names a service someone else runs, and
            // mounting it locally would serve pages at a path the redirects
            // never target.
            if (!isSameOrigin(candidate.url, config.publicUrl)) {
                continue;
            }

            const path = getURLBasePath(candidate.url);
            if (!path) {
                // Same origin and no path means the console would have to own
                // the API's own root, where it would shadow the protocol
                // routes, and the page GETs would redirect to themselves.
                // Refuse it by name rather than booting into a redirect loop.
                throw new AuthupError(
                    `The ${candidate.name} url is ${candidate.url}, which is this deployment's own origin root. ` +
                    'A console needs a path of its own (the defaults are under /console), or an origin of its own.',
                );
            }

            mounts.push({ path, handler: await candidate.create() });
        }

        return mounts;
    };
}

function isSameOrigin(a: string, b: string) : boolean {
    try {
        return new URL(a).origin === new URL(b).origin;
    } catch {
        return false;
    }
}
