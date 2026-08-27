/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import type { StaticConsole } from '@authup/server-console-kit';
import { defineStaticConsole } from '@authup/server-console-kit';
import { useRequestQuery } from '@routup/basic/query';
import type { IAppEvent } from 'routup';
import { PACKAGE_PATH } from '../../../../path.ts';
// The FILE, not the middleware barrel: the barrel reaches assets.ts, which
// imports this module. Through the barrel that is a cycle.
import { useRequestTheme } from '../../middleware/built-in/theme.ts';
import { ACCOUNT_CONSOLE_SEGMENT } from '../constants.ts';
import { resolveAccountConsoleRef } from './ref.ts';
import type { AccountConsoleServeOptions } from './types.ts';

let packagePath : string | undefined;
let instance : StaticConsole | undefined;

/**
 * The account console SPA (`@authup/client-account-console`), served at
 * `<publicUrl>/console/account`. Its runtime contract is the config marker
 * in the built `index.html`; the bundle's static assets ride the assets
 * middleware (`/console/account/assets`).
 */
export function useAccountConsole() : StaticConsole {
    instance = instance || defineStaticConsole({
        packageName: '@authup/client-account-console',
        marker: '<!--account-config-->',
        viteBase: `/${ACCOUNT_CONSOLE_SEGMENT}/`,
        cwd: PACKAGE_PATH,
        distPath: packagePath,
    });

    return instance;
}

/**
 * Point the resolution at a substituted package (config
 * `accountConsolePath`) instead of the node_modules walk. Called once at
 * boot.
 */
export function setAccountConsolePackagePath(value: string | undefined) : void {
    packagePath = value || undefined;
    instance = undefined;
}

export function resolveAccountConsoleDistPath() : string | undefined {
    return useAccountConsole().resolveDistPath();
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

    return useAccountConsole().serve(event, {
        basePath,
        theme: useRequestTheme(event),
        config: {
            apiUrl: options.baseURL,
            basePath: `${basePath}/${ACCOUNT_CONSOLE_SEGMENT}`,
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
