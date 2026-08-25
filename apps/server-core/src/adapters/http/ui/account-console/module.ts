/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import { defineStaticConsole } from '../static-console/index.ts';
import { resolveAccountConsoleRef } from './ref.ts';
import type { AccountConsoleServeOptions } from './types.ts';

/**
 * The account console SPA (`@authup/client-account-console`), served at
 * `<publicUrl>/account`. Its runtime contract is the config marker in the
 * built `index.html`; the bundle's static assets ride the assets middleware
 * (`/account/assets`).
 */
export const accountConsole = defineStaticConsole({
    packageName: '@authup/client-account-console',
    marker: '<!--account-config-->',
    viteBase: '/account/',
});

/**
 * Point the resolution at a substituted package (config
 * `accountConsolePath`) instead of the node_modules walk. Called once at
 * boot.
 */
export function setAccountConsolePackagePath(value: string | undefined) : void {
    accountConsole.setPackagePath(value);
}

export function resolveAccountConsoleDistPath() : string | undefined {
    return accountConsole.resolveDistPath();
}

/**
 * Serve the account console shell with its runtime configuration injected.
 *
 * publicUrl and the feature flags are operator config, but `ref` is
 * request-reflected, so it is validated against the trusted app origins
 * before it goes anywhere near the page.
 */
export function serveAccountConsolePage(
    event: IAppEvent,
    options: AccountConsoleServeOptions,
) : Promise<string> {
    const basePath = getURLBasePath(options.baseURL);

    return accountConsole.serve(event, {
        baseURL: options.baseURL,
        config: {
            apiUrl: options.baseURL,
            basePath: `${basePath}/account`,
            features: options.features,
            // This server implements the cookie-mode routes. It is a
            // capability assertion, not a setting: the console pairs it with
            // its own same-origin check before taking that path.
            cookieSession: true,
            ref: resolveAccountConsoleRef(
                useRequestQuery(event, 'ref'),
                options.trustedOrigins,
            ),
        },
    });
}
