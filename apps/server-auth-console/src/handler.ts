/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { createHandler } from '@routup/assets';
import path from 'node:path';
import { App, defineCoreHandler } from 'routup';
import { HEALTH_PATH } from './constants';
import {
    buildWorkflowPageData,
    createAPIClient,
    readAuthorizeInfo,
    readFeatures,
} from './payload';
import { renderAuthConsolePage } from './render';
import { resolveAuthConsoleDistPath, setAuthConsolePackagePath } from './resolve';
import type { AuthConsoleConfig } from './types';

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
export function createAuthConsoleHandler(config: AuthConsoleConfig) : App {
    setAuthConsolePackagePath(config.distPath);

    const app = new App();
    const client = createAPIClient(config);

    app.use(defineCoreHandler({
        method: 'get',
        path: HEALTH_PATH,
        fn: () => ({ status: 'ok' }),
    }));

    app.use(defineCoreHandler({
        method: 'get',
        path: '/authorize',
        fn: async (event) => renderAuthConsolePage(event, config, {
            url: '/authorize',
            data: await readAuthorizeInfo(client, event),
        }),
    }));

    for (const page of WORKFLOW_PAGES) {
        app.use(defineCoreHandler({
            method: 'get',
            path: page.url,
            fn: async (event) => {
                const features = await readFeatures(client);

                return renderAuthConsolePage(event, config, {
                    url: page.url,
                    data: buildWorkflowPageData(event, features, page),
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
        fn: async (event) => renderAuthConsolePage(event, config, {
            url: '/logout',
            data: {},
        }),
    }));

    // Only the assets directory is mounted, never dist/client itself: the
    // template and the ssr manifest are inputs of the render, not files to
    // serve. A missing bundle only disables the mount; the page routes
    // report the actionable error.
    const distPath = resolveAuthConsoleDistPath();
    if (distPath) {
        app.use('/assets', createHandler(
            path.posix.join(distPath, 'client', 'assets'),
            {
                fallthrough: false,
                scan: false,
            },
        ));
    }

    return app;
}
