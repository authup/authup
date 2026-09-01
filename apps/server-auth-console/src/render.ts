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
    applyTheme,
    applyUIPageHeaders,
    readUIClientPreferences,
    rebaseAssetURLs,
    replaceTemplateMarker,
    stampHtmlAttributes,
} from '@authup/server-console-kit';
import { read } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import { VITE_BASE } from './constants';
import { resolveDistPath } from './resolve';
import type { RenderPage } from './types';

// Process-lifetime caches for the immutable production SSR assets. The dist
// template, manifest and server bundle don't change after boot, so read them
// once instead of per request (the auth/login routes are hot paths).
let cachedHtml: string | undefined;
let cachedManifest: Record<string, any> | undefined;
let cachedRender: RenderFunction | undefined;

export const renderPage : RenderPage = async (event, config, ctx) => {
    const distPath = resolveDistPath();
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

    const [appHtml, preloadLinks] = await render({
        url: ctx.url,
        manifest,
        payload,
    });

    let body = replaceTemplateMarker(html, '<!--preload-links-->', preloadLinks);
    body = replaceTemplateMarker(body, '<!--app-html-->', appHtml);

    body = stampHtmlAttributes(body, preferences);

    // This service mounts the bundle's assets at its own /assets, so the
    // fixed vite base in every href is replaced by this service's public
    // path. The vite base was decided when the bundle was built and says
    // nothing about where the service is published.
    body = rebaseAssetURLs(body, VITE_BASE, `${basePath}/`);

    // The theme's own asset urls are built from the same base, and the
    // service mounts them under it, so a themed deployment needs no rule of
    // its own at the reverse proxy beyond the one that reaches this service.
    body = await applyTheme(body, ctx.theme, basePath);

    applyUIPageHeaders(event);

    return body;
};
