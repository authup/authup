/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { HydrationPayload, RenderFunction } from '@authup/client-auth-console';
import { InternalError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';
import {
    applyUIPageHeaders,
    readUIClientPreferences,
    rebaseAssetURLs,
    replaceTemplateMarker,
    stampHtmlAttributes,
} from '@authup/server-console-kit';
import { read } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import { AUTH_CONSOLE_VITE_BASE } from './constants';
import { resolveAuthConsoleDistPath } from './resolve';
import type { AuthConsoleConfig } from './types';

// Process-lifetime caches for the immutable production SSR assets. The dist
// template, manifest and server bundle don't change after boot, so read them
// once instead of per request (the auth/login routes are hot paths).
let cachedHtml: string | undefined;
let cachedManifest: Record<string, any> | undefined;
let cachedRender: RenderFunction | undefined;

/**
 * How much of the service's public path has to be prepended to the asset
 * hrefs the bundle emits.
 *
 * Those hrefs carry the fixed vite base (`/console/auth/`), which IS the
 * public asset path for the default deployment: the service is published at
 * `<origin>/console/auth`, the proxy strips that prefix, and the assets are
 * mounted here at `/assets`. Nothing to rebase.
 *
 * It stops being true when authup itself sits under a sub-path, e.g.
 * `https://example.com/auth/console/auth`. The href then has to become
 * `/auth/console/auth/assets/...`, so what gets prepended is the public
 * path MINUS the vite base it already ends with. A service published
 * somewhere that does not end in the vite base keeps its whole path, since
 * none of it is spelled in the href.
 */
export function resolveAssetPrefix(url: string) : string {
    const basePath = getURLBasePath(url);
    const viteBase = AUTH_CONSOLE_VITE_BASE.replace(/\/$/, '');

    if (basePath.endsWith(viteBase)) {
        return basePath.slice(0, basePath.length - viteBase.length);
    }

    return basePath;
}

export async function renderAuthConsolePage(
    event: IAppEvent,
    config: AuthConsoleConfig,
    ctx: { url: string, data: Record<string, any> },
) : Promise<string> {
    const distPath = resolveAuthConsoleDistPath();
    if (!distPath) {
        throw new InternalError(
            'The auth console bundle (@authup/client-auth-console) is not built or installed.',
        );
    }

    const html = (cachedHtml ??= await fs.promises.readFile(
        path.join(distPath, 'client', 'index.html'),
        'utf-8',
    ));
    const manifest = (cachedManifest ??= JSON.parse(await fs.promises.readFile(
        path.join(distPath, 'client', '.vite', 'ssr-manifest.json'),
        'utf-8',
    )));
    const render = (cachedRender ??= (await read(
        path.join(distPath, 'server', 'server.js'),
    )).render as RenderFunction);

    // The client app hydrates locale + color-mode from the payload, so it
    // adopts the same values the HTML shell is stamped with below.
    const preferences = readUIClientPreferences(event);

    // `baseURL` is server-core's public URL: the console derives its HTTP
    // client and its cookie path from it. `basePath` is where THIS service
    // is served, which is what the router and every inter-page href need.
    // Before the split the two were the same value; they are not any more,
    // so the console reads them separately.
    const payload : HydrationPayload = {
        config: {
            baseURL: config.apiUrl,
            basePath: getURLBasePath(config.url),
            colorMode: preferences.colorMode,
            locale: preferences.locale,
        },
        data: ctx.data,
    };

    const [appHtml, preloadLinks] = await render({
        url: ctx.url,
        manifest,
        payload,
    });

    let body = replaceTemplateMarker(html, '<!--preload-links-->', preloadLinks);
    body = replaceTemplateMarker(body, '<!--app-html-->', appHtml);

    body = stampHtmlAttributes(body, preferences);

    body = rebaseAssetURLs(body, resolveAssetPrefix(config.url), AUTH_CONSOLE_VITE_BASE);

    applyUIPageHeaders(event);

    return body;
}
