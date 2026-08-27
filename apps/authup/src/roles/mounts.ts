/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import { createAuthConsoleHandler } from '@authup/server-auth-console';
import type { ApplicationMount, Config } from '@authup/server-core';

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
 * A split deployment mounts nothing here and runs the services behind
 * their own listeners, with the proxy routing `/console/**` to them. The
 * page GETs redirect either way, so a misrouted request is harmless.
 */
export function buildApplicationMounts(config: Config) : ApplicationMount[] {
    const mounts : ApplicationMount[] = [];

    // The path the console is served under, derived from the same config
    // value the page GETs redirect to, so the hop always lands on it.
    const path = getURLBasePath(config.authConsoleUrl);
    if (path) {
        mounts.push({
            path,
            handler: createAuthConsoleHandler({
                url: config.authConsoleUrl,
                apiUrl: config.publicUrl,
                distPath: config.authConsolePath,
            }),
        });
    }

    return mounts;
}
