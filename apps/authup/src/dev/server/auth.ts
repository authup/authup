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
import { createAPIClient, readRenderCookies } from '@authup/server-auth-console';
import {
    applyTheme,
    applyUIPageHeaders,
    readUIClientPreferences,
    replaceTemplateMarker,
    stampHtmlAttributes,
} from '@authup/server-console-kit';
import fs from 'node:fs';
import path from 'node:path';
import type { EnvironmentModuleGraph, EnvironmentModuleNode, ViteDevServer } from 'vite';
import { createConsoleViteServer } from './module.ts';
import type { AuthConsoleDevServer } from './types.ts';

type ViteRenderContext = Pick<
    ViteDevServer,
'transformIndexHtml' | 'ssrLoadModule' | 'ssrFixStacktrace'
> & {
    environments: { ssr: { moduleGraph: Pick<EnvironmentModuleGraph, 'getModuleByUrl'> } },
};

const SSR_ENTRY = '/src/server.ts';

const CSS_REQUEST = /\.(css|less|sass|scss|styl|stylus|pcss|postcss|sss)$/;

/**
 * The stylesheets the SSR entry reaches, inlined as the `<style>` tags vite's
 * client would create itself. A build links them through the manifest; dev
 * has none, so without this the markup paints unstyled (white) until the
 * client modules load, which a fast reload makes visible every time. The
 * `data-vite-dev-id` is what vite's client looks a sheet up by, so it adopts
 * these tags on hot updates instead of appending a second copy.
 */
async function renderDevStyles(vite: ViteRenderContext) : Promise<string> {
    const entry = await vite.environments.ssr.moduleGraph.getModuleByUrl(SSR_ENTRY);
    if (!entry) {
        return '';
    }

    const sheets : EnvironmentModuleNode[] = [];
    const seen = new Set<EnvironmentModuleNode>();
    const queue = [entry];
    while (queue.length > 0) {
        const mod = queue.shift()!;
        if (seen.has(mod)) {
            continue;
        }

        seen.add(mod);
        if (mod.id && CSS_REQUEST.test(mod.id)) {
            sheets.push(mod);
        }

        queue.push(...mod.importedModules);
    }

    const tags = await Promise.all(sheets.map(async (sheet) => {
        const { default: css } = await vite.ssrLoadModule(`${sheet.url}?inline`);
        const id = (sheet.id as string).replace(/&/g, '&amp;').replace(/"/g, '&quot;');

        return `<style type="text/css" data-vite-dev-id="${id}">${String(css).replace(/<\/style/gi, '<\\/style')}</style>`;
    }));

    return tags.join('');
}

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

        let appHtml : string;
        let preloadLinks : string;

        try {
            // Loaded INSIDE the try, because a broken SSR entry (or anything
            // it imports) throws here rather than in the render, and that is
            // the failure a contributor hits most. Loading it above would
            // hand them bundled frames for exactly that case.
            const render = (await vite.ssrLoadModule(SSR_ENTRY)).render as RenderFunction;

            // The manifest drives preload links, which only a build produces.
            // Dev loads every module through the server, so an empty one is
            // correct rather than a degradation.
            [appHtml, preloadLinks] = await render({
                url: ctx.url,
                manifest: {},
                payload,
                httpClient: createAPIClient(config),
                cookies: ctx.session ? readRenderCookies(event) : {},
            });

            preloadLinks = await renderDevStyles(vite) + preloadLinks;
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
}) : Promise<AuthConsoleDevServer> {
    const { server, hmrPort } = await createConsoleViteServer(options);

    return {
        middlewares: server.middlewares,
        hmrPort,
        render: createViteRender(server, options.root),
        close: () => server.close(),
    };
}
