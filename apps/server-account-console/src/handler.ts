/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import type { IThemeProvider } from '@authup/server-console-kit';
import {
    THEME_ASSET_MOUNT_PATH,
    ThemeProvider,
    createThemeAssetsHandler,
    defineStaticConsole,
} from '@authup/server-console-kit';
import { createHandler } from '@routup/assets';
import { basic } from '@routup/basic';
import { useRequestQuery } from '@routup/basic/query';
import { NotFoundError } from '@ebec/http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import type { IAppEvent } from 'routup';
import { App, defineCoreHandler } from 'routup';
import {
    ACCOUNT_CONSOLE_CONFIG_MARKER,
    ACCOUNT_CONSOLE_PACKAGE_NAME,
    ACCOUNT_CONSOLE_VITE_BASE,
    HEALTH_PATH,
} from './constants';
import { PACKAGE_PATH } from './path';
import { resolveAccountConsoleRef } from './ref';
import { expandToOrigins } from '@authup/server-config';
import type { Config } from './types';

const ASSETS_PATH = '/assets';

/**
 * The origins the `ref` back-link parameter is validated against: the API's
 * own origin plus every trusted one. Mirrors server-core's `getAppOrigins`.
 *
 * The configured entries are expanded HERE rather than assumed canonical. A
 * bare host is a supported way to write the key, and it expands to both its
 * http and its https origin; taken verbatim it becomes the pattern
 * `hub.local/**`, which is matched against an absolute URL and therefore
 * matches nothing, so the back link disappears for exactly the origins
 * written in the short form, with no diagnostic anywhere. `expandToOrigins`
 * is idempotent, so an already-canonical list passes through untouched and
 * this service no longer depends on someone else having normalized for it.
 *
 * Resolved once per handler rather than per request: the list is operator
 * configuration and cannot change while the service runs.
 */
function buildAppOrigins(config: Config) : string[] {
    const origins = new Set<string>();
    origins.add(new URL(config.apiUrl).origin);

    for (const value of config.trustedOrigins ?? []) {
        for (const origin of expandToOrigins(value)) {
            origins.add(origin);
        }
    }

    return Array.from(origins);
}

/**
 * Load the operator theme, if one is configured.
 *
 * A missing directory disables the feature entirely: no provider is created,
 * no route is mounted, and the served shell stays byte-identical to an
 * un-themed one. So the default configuration pays nothing.
 */
async function createThemeProvider(config: Config) : Promise<IThemeProvider | undefined> {
    if (!config.theme.directoryPath || !fs.existsSync(config.theme.directoryPath)) {
        return undefined;
    }

    const provider = new ThemeProvider({
        directoryPath: config.theme.directoryPath,
        fragmentsEnabled: config.theme.fragmentsEnabled,
        // The boot inventory this logs (resolved path, token counts, every
        // servable file) is the antidote to the feature's dominant failure
        // mode, which is silence.
        logger: console,
    });

    await provider.load();

    return provider;
}

/**
 * The service as a mountable routup handler, so the CLI can compose it onto
 * server-core's own listener for the single-container deployment while a
 * split deployment runs it behind its own server.
 *
 * The paths are prefix-free. authup assumes a prefix-stripping reverse proxy,
 * so a service published at `<origin>/console/account` receives `/sessions`,
 * exactly as the console's own router sees it.
 */
export async function createAccountConsoleHandler(config: Config) : Promise<App> {
    const app = new App();

    // The shell is stamped from the vc-locale / vc-color-mode cookies and the
    // back link is read from the query, and without the plugin both reads
    // answer undefined.
    app.use(basic({ cookie: true, query: true }));

    app.use(defineCoreHandler({
        method: 'get',
        path: HEALTH_PATH,
        fn: () => ({ status: 'ok' }),
    }));

    const basePath = getURLBasePath(config.url);
    const appOrigins = buildAppOrigins(config);

    const theme = await createThemeProvider(config);
    if (theme) {
        app.use(THEME_ASSET_MOUNT_PATH, createThemeAssetsHandler(theme));
    }

    // One instance per handler call: every piece of state the closure holds
    // is instance-scoped, so two applications in one process never share a
    // substituted package path or a resolved dist.
    const staticConsole = defineStaticConsole({
        packageName: ACCOUNT_CONSOLE_PACKAGE_NAME,
        marker: ACCOUNT_CONSOLE_CONFIG_MARKER,
        viteBase: ACCOUNT_CONSOLE_VITE_BASE,
        cwd: PACKAGE_PATH,
        distPath: config.distPath || undefined,
    });

    // Every file under a vite `assets/` output carries a content hash in its
    // name, so a client may cache it for as long as it likes: a new build
    // means new names. Without this the default `max-age=0, must-revalidate`
    // re-requested all 140+ files on every full document load.
    const distPath = staticConsole.resolveDistPath();
    if (distPath) {
        app.use(ASSETS_PATH, createHandler(
            path.posix.join(distPath, 'assets'),
            {
                fallthrough: false,
                scan: false,
                cacheMaxAge: 60 * 60 * 24 * 365,
                cacheImmutable: true,
            },
        ));
    }

    const render = (event: IAppEvent) : Promise<string> => staticConsole.serve(event, {
        basePath,
        // This service mounts the bundle's assets at its own /assets, so
        // the fixed vite base in every href is replaced by this service's
        // public path. The vite base was decided when the bundle was
        // built and says nothing about where the service is published.
        assetBasePath: `${basePath}/`,
        theme,
        config: {
            apiUrl: config.apiUrl,
            basePath,
            // The service serving a console is the authority on whether
            // it is serving it, so the flag is its own rather than read
            // back from server-core's status endpoint.
            features: { accountConsole: config.enabled },
            // This deployment implements the cookie-mode routes. It is a
            // capability assertion, not a setting: the console pairs it
            // with its own same-origin check before taking that path.
            cookieSession: true,
            // Everything else here is operator config, but `ref` is
            // request-reflected, so it is validated against the trusted
            // app origins before it goes anywhere near the page.
            ref: resolveAccountConsoleRef(useRequestQuery(event, 'ref'), appOrigins),
        },
    });

    app.use(defineCoreHandler({
        method: 'get',
        path: '',
        fn: render,
    }));

    // A wildcard rather than a single segment: the console's routes are flat
    // today, but one spelling covers both consoles and a nested route added
    // later needs no change here.
    app.use(defineCoreHandler({
        method: 'get',
        path: '/*page',
        fn: (event) => {
            // The assets mount is decided at boot: with no built bundle there
            // is none, and an asset request would fall through to the shell.
            // A 200 HTML answer for a module script is a blank console with
            // no error anywhere; a 404 says what is missing.
            if (event.path.toLowerCase().startsWith(`${ASSETS_PATH}/`)) {
                throw new NotFoundError();
            }

            return render(event);
        },
    }));

    return app;
}
