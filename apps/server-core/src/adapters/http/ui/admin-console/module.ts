/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import type { IAppEvent } from 'routup';
import { defineStaticConsole } from '../static-console/index.ts';
import type { AdminConsoleServeOptions } from './types.ts';

/**
 * The admin console SPA (`@authup/client-admin-console`), served at
 * `<publicUrl>/admin` (plan 081). Same seam as the account console: the
 * config marker in the built `index.html` is its runtime contract, the
 * bundle's static assets ride the assets middleware (`/admin/assets`).
 */
export const adminConsole = defineStaticConsole({
    packageName: '@authup/client-admin-console',
    marker: '<!--admin-config-->',
    viteBase: '/admin/',
});

/**
 * Point the resolution at a substituted package (config `adminConsolePath`)
 * instead of the node_modules walk. Called once at boot.
 */
export function setAdminConsolePackagePath(value: string | undefined) : void {
    adminConsole.setPackagePath(value);
}

export function resolveAdminConsoleDistPath() : string | undefined {
    return adminConsole.resolveDistPath();
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

    return adminConsole.serve(event, {
        baseURL: options.baseURL,
        config: {
            apiUrl: options.baseURL,
            basePath: `${basePath}/admin`,
            features: options.features,
            // This server implements the cookie-mode routes (/admin/login,
            // /admin/callback, /sessions/@me). A capability assertion, not a
            // setting: the console pairs it with its own same-origin check.
            cookieSession: true,
        },
    });
}
