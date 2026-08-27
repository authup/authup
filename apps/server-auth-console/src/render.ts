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
 * Point the bundle's asset hrefs at where this service actually serves
 * them.
 *
 * There is one invariant to keep, and it is what makes this a rewrite
 * rather than a prefix: the public asset URL must be the service's own
 * public path plus the route the assets are mounted on, which is
 * `/assets`. The hrefs the bundle emits carry a FIXED vite base
 * (`/console/auth/`) instead, decided when the bundle was built and
 * unrelated to where the service is published, so the base is replaced
 * rather than prepended to.
 *
 * Prepending happens to work while the service is published at exactly
 * that vite base, which is the default. It breaks the moment it is not:
 * a service at `/login` would emit `/login/console/auth/assets/...`, and
 * once the proxy strips `/login` the request arrives as
 * `/console/auth/assets/...`, which nothing serves.
 */
export function rebaseConsoleAssets(html: string, url: string) : string {
    const basePath = getURLBasePath(url);

    return html.replace(
        new RegExp(`(src|href)="${AUTH_CONSOLE_VITE_BASE.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}`, 'g'),
        (_match, attribute) => `${attribute}="${basePath}/`,
    );
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

    body = rebaseConsoleAssets(body, config.url);

    applyUIPageHeaders(event);

    return body;
}
