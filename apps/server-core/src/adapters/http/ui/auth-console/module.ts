/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RenderFunction } from '@authup/client-auth-console';
import { InternalError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';
import { read } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import type { ViteDevServer } from 'vite';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import type { IClient } from '@authup/core-http-kit';
import { UI_HTTP_CLIENT_FACTORY_STORE_KEY, VITE_SERVER_STORE_KEY } from '../../middleware/index.ts';
import {
    applyUIPageHeaders,
    readUIClientPreferences,
    rebaseAssetURLs,
    stampHtmlAttributes,
} from '../shared/index.ts';
import { resolveAuthConsoleDistPath, resolveAuthConsolePackagePath } from './resolve.ts';
import type { UIRenderContext } from './types.ts';

// Process-lifetime caches for the immutable production SSR assets. The dist
// template, manifest and server bundle don't change after boot, so read them
// once instead of per request (the auth/login routes are hot paths). The JIT
// (dev) path deliberately re-reads so HMR keeps working.
let cachedHtml: string | undefined;
let cachedManifest: Record<string, any> | undefined;
let cachedRender: RenderFunction | undefined;

export async function renderUIPage(event: IAppEvent, ctx: UIRenderContext): Promise<string> {
    const isJIT = isCodeTransformation(CodeTransformation.JUST_IN_TIME);

    // The client app hydrates locale + color-mode from the payload, so it
    // adopts the same values the HTML shell is stamped with below.
    const preferences = readUIClientPreferences(event);
    ctx.payload.config.colorMode = preferences.colorMode;
    ctx.payload.config.locale = preferences.locale;

    let html : string;
    let manifest : Record<string, any>;
    let render : RenderFunction;

    if (isJIT) {
        const packagePath = resolveAuthConsolePackagePath();
        if (!packagePath) {
            throw new InternalError(
                'The auth console package (@authup/client-auth-console) is not installed.',
            );
        }

        const vite = event.store[VITE_SERVER_STORE_KEY] as ViteDevServer;

        html = await fs.promises.readFile(
            path.join(packagePath, 'index.html'),
            'utf-8',
        );
        html = await vite.transformIndexHtml('/', html);
        manifest = {};
        render = (await vite.ssrLoadModule('/src/server.ts')).render as RenderFunction;
    } else {
        const distPath = resolveAuthConsoleDistPath();
        if (!distPath) {
            throw new InternalError(
                'The auth console bundle (@authup/client-auth-console) is not built or installed.',
            );
        }

        html = (cachedHtml ??= await fs.promises.readFile(
            path.join(distPath, 'client', 'index.html'),
            'utf-8',
        ));
        manifest = (cachedManifest ??= JSON.parse(await fs.promises.readFile(
            path.join(distPath, 'client', '.vite', 'ssr-manifest.json'),
            'utf-8',
        )));
        render = (cachedRender ??= (await read(
            path.join(distPath, 'server', 'server.js'),
        )).render as RenderFunction);
    }

    const httpClientFactory = event.store[UI_HTTP_CLIENT_FACTORY_STORE_KEY] as (() => IClient) | undefined;

    const [appHtml, preloadLinks] = await render({
        url: ctx.url,
        manifest,
        payload: ctx.payload,
        httpClient: httpClientFactory ? httpClientFactory() : undefined,
    });

    let body = html
        .replace('<!--preload-links-->', preloadLinks)
        .replace('<!--app-html-->', appHtml);

    body = stampHtmlAttributes(body, preferences);

    // When authup is publicly served under a sub-path (publicUrl carries a
    // pathname, e.g. https://example.com/auth), the fixed /public/ vite base
    // would bypass the proxy mapping — rebase asset URLs onto the prefix.
    body = rebaseAssetURLs(body, getURLBasePath(ctx.payload.config.baseURL), '/public/');

    applyUIPageHeaders(event);

    return body;
}
