/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HydrationPayload, RenderFunction } from '@authup/client-auth-console';
import { isError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';
import type { RenderPage } from '@authup/server-auth-console';
import {
    applyTheme,
    applyUIPageHeaders,
    readUIClientPreferences,
    replaceTemplateMarker,
    stampHtmlAttributes,
} from '@authup/server-console-kit';
import fs from 'node:fs';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { createConsoleViteServer } from './server.ts';
import type { AuthConsoleDevServer } from './types.ts';

type ViteRenderContext = Pick<
    ViteDevServer,
'transformIndexHtml' | 'ssrLoadModule' | 'ssrFixStacktrace'
>;

/**
 * The service's own render, with the three inputs it reads from the built
 * bundle taken from vite instead: the template, the ssr manifest and the
 * render entry. Nothing else differs, so the page a contributor sees is the
 * page the service serves.
 *
 * There is no `rebaseAssetURLs` here, and that is not an omission: the
 * production render rewrites the bundle's FIXED vite base onto the path the
 * service is published at, while the dev server is given that path as its
 * base, so every url it emits is already right.
 */
export function createViteRender(vite: ViteRenderContext, root: string) : RenderPage {
    return async (event, config, ctx) => {
        const preferences = readUIClientPreferences(event);
        const basePath = getURLBasePath(config.url);

        const payload : HydrationPayload = {
            config: {
                baseURL: config.apiUrl,
                basePath,
                colorMode: preferences.colorMode,
                locale: preferences.locale,
            },
            data: ctx.data,
        };

        const template = await fs.promises.readFile(path.join(root, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(ctx.url, template);
        const render = (await vite.ssrLoadModule('/src/server.ts')).render as RenderFunction;

        let appHtml : string;
        let preloadLinks : string;

        try {
            // The manifest drives preload links, which only a build produces.
            // Dev loads every module through the server, so an empty one is
            // correct rather than a degradation.
            [appHtml, preloadLinks] = await render({
                url: ctx.url,
                manifest: {},
                payload,
            });
        } catch (e) {
            if (isError(e)) {
                vite.ssrFixStacktrace(e);
            }

            throw e;
        }

        let body = replaceTemplateMarker(html, '<!--preload-links-->', preloadLinks);
        body = replaceTemplateMarker(body, '<!--app-html-->', appHtml);
        body = stampHtmlAttributes(body, preferences);
        body = await applyTheme(body, ctx.theme, basePath);

        applyUIPageHeaders(event);

        return body;
    };
}

/**
 * A vite dev server for the auth console. `appType` is `custom` because this
 * console is server-rendered: vite serves its client modules and the HMR
 * socket, and every page route stays the service's own.
 */
export async function createAuthConsoleDevServer(options: {
    packageName: string,
    root: string,
    basePath: string,
    hmrPort: number,
}) : Promise<AuthConsoleDevServer> {
    const server = await createConsoleViteServer(options);

    return {
        middlewares: server.middlewares,
        render: createViteRender(server, options.root),
        close: () => server.close(),
    };
}
