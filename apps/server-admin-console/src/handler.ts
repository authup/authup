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
    createThemeAssetsHandler,
    createThemeProvider,
    defineStaticConsole,
} from '@authup/server-console-kit';
import { createHandler as createAssetsHandler } from '@routup/assets';
import { basic } from '@routup/basic';
import { NotFoundError } from '@ebec/http';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import { App, defineCoreHandler } from 'routup';
import {
    CONFIG_MARKER,
    HEALTH_PATH,
    PACKAGE_NAME,
    VITE_BASE,
} from './constants';
import { PACKAGE_PATH } from './path';
import type { Config } from './types';

const ASSETS_PATH = '/assets';


/**
 * The service as a mountable routup handler, so the CLI can compose it onto
 * server-core's own listener for the single-container deployment while a
 * split deployment runs it behind its own server.
 *
 * The paths are prefix-free. authup assumes a prefix-stripping reverse proxy,
 * so a service published at `<origin>/console/admin` receives `/users/<id>`,
 * exactly as the console's own router sees it.
 */
export async function createHandler(
    config: Config,
    themeProvider?: IThemeProvider,
    readShell?: (event: IAppEvent) => Promise<string>,
) : Promise<App> {
    const app = new App();

    // The shell is stamped from the vc-locale / vc-color-mode cookies, and
    // without the plugin every cookie read answers undefined, which is a
    // silent flash of the wrong color mode on every full load.
    app.use(basic({ cookie: true, query: true }));

    app.use(defineCoreHandler({
        method: 'get',
        path: HEALTH_PATH,
        fn: () => ({ status: 'ok' }),
    }));

    const basePath = getURLBasePath(config.url);

    // Injected by the theme module when this runs inside the console
    // application; built here for a caller holding only a config.
    const theme = themeProvider ?? await createThemeProvider(config);
    if (theme) {
        app.use(THEME_ASSET_MOUNT_PATH, createThemeAssetsHandler(theme));
    }

    // One instance per handler call: every piece of state the closure holds
    // is instance-scoped, so two applications in one process never share a
    // substituted package path or a resolved dist.
    const staticConsole = defineStaticConsole({
        packageName: PACKAGE_NAME,
        marker: CONFIG_MARKER,
        viteBase: VITE_BASE,
        cwd: PACKAGE_PATH,
        distPath: config.distPath || undefined,
        readShell,
    });

    // Every file under a vite `assets/` output carries a content hash in its
    // name, so a client may cache it for as long as it likes: a new build
    // means new names. Without this the default `max-age=0, must-revalidate`
    // re-requested all 140+ files on every full document load.
    const distPath = staticConsole.resolveDistPath();
    if (distPath) {
        app.use(ASSETS_PATH, createAssetsHandler(
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
            accountConsoleUrl: config.accountConsoleUrl,
            basePath,
            // The service serving a console is the authority on whether
            // it is serving it, so the flag is its own rather than read
            // back from server-core's status endpoint.
            features: { adminConsole: config.enabled },
            // This deployment implements the cookie-mode routes. It is a
            // capability assertion, not a setting: the console pairs it
            // with its own same-origin check.
            cookieSession: true,
        },
    });

    app.use(defineCoreHandler({
        method: 'get',
        path: '',
        fn: render,
    }));

    // The console's routes nest (`/users/<id>/roles`), so the shell route is
    // a wildcard rather than a single segment.
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
