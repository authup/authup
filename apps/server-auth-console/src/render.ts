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
import { CONTRACT_VERSION, VITE_BASE } from './constants';
import { resolveDistPath } from './resolve';
import type { RenderPage } from './types';

/**
 * Refuse a bundle built against another render contract at boot, naming the
 * entry and both versions, instead of failing per request on `/authorize`.
 * A bundle predating the export is version 1. Reads the module itself, which
 * Node's ESM cache then hands the render for free.
 */
export async function assertRenderContract(distPath: string) : Promise<void> {
    const entry = path.join(distPath, 'server', 'server.js');
    const bundle = await read(entry) as Record<string, any>;
    const version = bundle.CONTRACT_VERSION ?? 1;

    if (version !== CONTRACT_VERSION) {
        throw new InternalError(
            `The auth console bundle "${entry}" implements render-contract version ${version}, ` +
            `but this service requires ${CONTRACT_VERSION}. ` +
            'Rebuild it against the current @authup/client-auth-console contract.',
        );
    }
}

export function createRenderPage(distPath?: string) : RenderPage {
    // Per-handler caches for the immutable production SSR assets: the dist
    // template, manifest and server bundle do not change after boot, so read
    // them once instead of per request (the auth/login routes are hot paths).
    // Held in this closure rather than at module scope so a second handler in
    // the process, with a substituted package, never renders another's
    // template. Only a resolved dist is kept, so a bundle built after boot is
    // picked up on the next request.
    let cachedDistPath: string | undefined;
    let cachedHtml: string | undefined;
    let cachedManifest: Record<string, any> | undefined;
    let cachedRender: RenderFunction | undefined;

    return async (event, config, ctx) => {
        const resolved = (cachedDistPath ??= resolveDistPath(distPath));
        if (!resolved) {
            throw new InternalError(
                'The auth console bundle (@authup/client-auth-console) is not built or installed.',
            );
        }

        const html = (cachedHtml ??= await fs.promises.readFile(
            path.join(resolved, 'client', 'index.html'),
            'utf-8',
        ));
        const manifest = (cachedManifest ??= JSON.parse(await fs.promises.readFile(
            path.join(resolved, 'client', '.vite', 'ssr-manifest.json'),
            'utf-8',
        )));
        const render = (cachedRender ??= (await read(
            path.join(resolved, 'server', 'server.js'),
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
}
