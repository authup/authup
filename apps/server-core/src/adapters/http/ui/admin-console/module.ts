/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import type { StaticConsole } from '@authup/server-console-kit';
import { defineStaticConsole } from '@authup/server-console-kit';
import type { IAppEvent } from 'routup';
import { PACKAGE_PATH } from '../../../../path.ts';
// The FILE, not the middleware barrel: the barrel reaches assets.ts, which
// imports this module. Through the barrel that is a cycle.
import { useRequestTheme } from '../../middleware/built-in/theme.ts';
import { ADMIN_CONSOLE_SEGMENT } from '../constants.ts';
import type { AdminConsoleServeOptions } from './types.ts';

let packagePath : string | undefined;
let instance : StaticConsole | undefined;

/**
 * The admin console SPA (`@authup/client-admin-console`), served at
 * `<publicUrl>/console/admin` (plan 081). Same seam as the account console:
 * the config marker in the built `index.html` is its runtime contract, the
 * bundle's static assets ride the assets middleware (`/console/admin/assets`).
 */
export function useAdminConsole() : StaticConsole {
    instance = instance || defineStaticConsole({
        packageName: '@authup/client-admin-console',
        marker: '<!--admin-config-->',
        viteBase: `/${ADMIN_CONSOLE_SEGMENT}/`,
        cwd: PACKAGE_PATH,
        distPath: packagePath,
    });

    return instance;
}

/**
 * Point the resolution at a substituted package (config `adminConsolePath`)
 * instead of the node_modules walk. Called once at boot.
 */
export function setAdminConsolePackagePath(value: string | undefined) : void {
    packagePath = value || undefined;
    instance = undefined;
}

export function resolveAdminConsoleDistPath() : string | undefined {
    return useAdminConsole().resolveDistPath();
}

/**
 * Serve the admin console shell with its runtime configuration injected.
 * Operator-level config only (publicUrl, base path, feature flags): the
 * shell is static and nothing actor-scoped may enter a cacheable body.
 */
export function serveAdminConsolePage(
    event: IAppEvent,
    options: AdminConsoleServeOptions,
) : Promise<string> {
    const basePath = getURLBasePath(options.baseURL);

    return useAdminConsole().serve(event, {
        basePath,
        // This server mounts the bundle's assets AT its vite base, under the
        // deployment's own sub-path, so that is what the hrefs are rebased
        // onto. A console SERVICE mounts them at its own /assets instead.
        assetBasePath: `${basePath}/${ADMIN_CONSOLE_SEGMENT}/`,
        theme: useRequestTheme(event),
        config: {
            apiUrl: options.baseURL,
            basePath: `${basePath}/${ADMIN_CONSOLE_SEGMENT}`,
            features: options.features,
            // This server implements the cookie-mode routes
            // (/console/admin/login, /console/admin/callback, /sessions/@me).
            // A capability assertion, not a setting: the console pairs it
            // with its own same-origin check.
            cookieSession: true,
        },
    });
}
