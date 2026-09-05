/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IThemeProvider } from '@authup/server-console-kit';
import {
    THEME_ASSET_MOUNT_PATH,
    createThemeAssetsHandler,
    createThemeProvider,
} from '@authup/server-console-kit';
import { createHandler as createAssetsHandler } from '@routup/assets';
import { basic } from '@routup/basic';
import path from 'node:path';
import type { IApp } from 'routup';
import { App, defineCoreHandler } from 'routup';
import { ASSETS_PATH, HEALTH_PATH } from './constants';
import {
    buildWorkflowPageData,
    createAPIClient,
    createFeaturesReader,
    readAuthorizeInfo,
} from './payload';
import { assertRenderContract, createRenderPage } from './render';
import { resolveDistPath } from './resolve';
import type { Config, RenderPage } from './types';

const WORKFLOW_PAGES : {
    url: string,
    realmAware?: boolean,
    tokenAware?: boolean
}[] = [
    { url: '/register', realmAware: true },
    { url: '/activate', tokenAware: true },
    { url: '/password-forgot', realmAware: true },
    {
        url: '/password-reset',
        realmAware: true,
        tokenAware: true,
    },
];

/**
 * The service as a mountable routup handler, so the CLI can compose it onto
 * server-core's own listener for the single-container deployment while a
 * split deployment runs it behind its own server.
 *
 * The paths are prefix-free. authup assumes a prefix-stripping reverse
 * proxy, so a service published at `<origin>/console/auth` receives
 * `/authorize`, exactly as server-core received it before the split.
 */
export async function createHandler(
    config: Config,
    themeProvider?: IThemeProvider,
    render?: RenderPage,
) : Promise<IApp> {
    const renderPage = render ?? createRenderPage(config.distPath);

    const app = new App();
    const client = createAPIClient(config);
    const readFeatures = createFeaturesReader(client);

    // The shell is stamped from the vc-locale / vc-color-mode cookies, and
    // without the plugin every cookie read answers undefined, which is a
    // silent flash of the wrong color mode on every full load. server-core
    // registers it globally, so a mounted handler inherits one; a standalone
    // service has nothing above it.
    app.use(basic({ cookie: true, query: true }));

    // A missing directory disables theming entirely: no provider is created
    // and the rendered pages are byte-identical to the un-themed ones, so the
    // default configuration pays nothing. An invalid manifest throws here and
    // fails the boot rather than surfacing per request.
    // Injected by the theme module when this runs inside the console
    // application; built here for a caller holding only a config.
    const theme = themeProvider ?? await createThemeProvider(config);

    app.use(defineCoreHandler({
        method: 'get',
        path: HEALTH_PATH,
        fn: () => ({ status: 'ok' }),
    }));

    if (theme) {
        app.use(THEME_ASSET_MOUNT_PATH, createThemeAssetsHandler(theme));
    }

    app.use(defineCoreHandler({
        method: 'get',
        path: '/authorize',
        fn: async (event) => renderPage(event, config, {
            url: '/authorize',
            data: await readAuthorizeInfo(client, event),
            theme,
        }),
    }));

    for (const page of WORKFLOW_PAGES) {
        app.use(defineCoreHandler({
            method: 'get',
            path: page.url,
            fn: async (event) => {
                const features = await readFeatures();

                return renderPage(event, config, {
                    url: page.url,
                    data: buildWorkflowPageData(event, features, page),
                    theme,
                });
            },
        }));
    }

    // The logout page needs nothing resolved up front: it drives the
    // end-session call itself and renders from the answer, so the render
    // stays a pure shell and no request reaches server-core here.
    app.use(defineCoreHandler({
        method: 'get',
        path: '/logout',
        fn: async (event) => renderPage(event, config, {
            url: '/logout',
            data: {},
            theme,
        }),
    }));

    // Only the assets directory is mounted, never dist/client itself: the
    // template and the ssr manifest are inputs of the render, not files to
    // serve. A missing bundle only disables the mount; the page routes
    // report the actionable error. A resolved one is checked against the
    // render contract here, unless a substituted render never reads it.
    const distPath = resolveDistPath(config.distPath);
    if (distPath) {
        if (!render) {
            await assertRenderContract(distPath);
        }

        // Every name carries a content hash, so a new build means new names.
        app.use(ASSETS_PATH, createAssetsHandler(
            path.posix.join(distPath, 'client', 'assets'),
            {
                fallthrough: false,
                scan: false,
                cacheMaxAge: 60 * 60 * 24 * 365,
                cacheImmutable: true,
            },
        ));
    }

    return app;
}
