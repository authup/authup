/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getURLBasePath } from '@authup/kit';
import { useRequestCookie } from '@routup/basic/cookie';
import { read } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import type { ViteDevServer } from 'vite';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import type { IClient } from '@authup/core-http-kit';
import { UI_DIST_PATH, UI_SOURCE_PATH } from '../../../path.ts';
import { UI_HTTP_CLIENT_FACTORY_STORE_KEY, VITE_SERVER_STORE_KEY } from '../middleware/index.ts';
import { LOCALE_COOKIE } from '../request/helpers/locale.ts';
import { rebasePublicAssetURLs } from './base-path.ts';
import type { UIRenderContext } from './types.ts';

const COLOR_MODE_COOKIE = 'vc-color-mode';

// Process-lifetime caches for the immutable production SSR assets. The dist
// template, manifest and server bundle don't change after boot, so read them
// once instead of per request (the auth/login routes are hot paths). The JIT
// (dev) path deliberately re-reads so HMR keeps working.
let cachedHtml: string | undefined;
let cachedManifest: Record<string, any> | undefined;
let cachedRender: CallableFunction | undefined;

export async function renderUIPage(event: IAppEvent, ctx: UIRenderContext): Promise<string> {
    const isJIT = isCodeTransformation(CodeTransformation.JUST_IN_TIME);

    // Mirror @vuecs/nuxt's SSR plugins: resolve the cookies server-side so
    // the HTML shell already carries the `.dark`/`.light` class and lang
    // attribute (no flash) and the client app hydrates from the same values.
    const colorMode = useRequestCookie(event, COLOR_MODE_COOKIE);
    ctx.payload.config.colorMode = colorMode;

    const locale = useRequestCookie(event, LOCALE_COOKIE);
    ctx.payload.config.locale = locale;

    let html : string;
    let manifest : Record<string, any>;
    let render : CallableFunction;

    if (isJIT) {
        const vite = event.store[VITE_SERVER_STORE_KEY] as ViteDevServer;

        html = await fs.promises.readFile(
            path.join(UI_SOURCE_PATH, 'index.html'),
            'utf-8',
        );
        html = await vite.transformIndexHtml('/', html);
        manifest = {};
        render = (await vite.ssrLoadModule('/src/server.ts')).render;
    } else {
        html = (cachedHtml ??= await fs.promises.readFile(
            path.join(UI_DIST_PATH, 'client', 'index.html'),
            'utf-8',
        ));
        manifest = (cachedManifest ??= JSON.parse(await fs.promises.readFile(
            path.join(UI_DIST_PATH, 'client', '.vite', 'ssr-manifest.json'),
            'utf-8',
        )));
        render = (cachedRender ??= (await read(
            path.join(UI_DIST_PATH, 'server', 'server.js'),
        )).render);
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

    let htmlAttrs = 'lang="en"';
    if (locale && /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/.test(locale)) {
        htmlAttrs = `lang="${locale}"`;
    }
    if (colorMode === 'dark' || colorMode === 'light') {
        htmlAttrs += ` class="${colorMode}"`;
    }
    // Match the opening <html> tag by pattern rather than an exact literal,
    // so a reformatted tag / dev-mode transformIndexHtml rewrite still gets
    // the lang + color-mode attributes (no silent FOUC).
    body = body.replace(/<html\b[^>]*>/i, `<html ${htmlAttrs}>`);

    // When authup is publicly served under a sub-path (publicUrl carries a
    // pathname, e.g. https://example.com/auth), the fixed /public/ vite base
    // would bypass the proxy mapping — rebase asset URLs onto the prefix.
    body = rebasePublicAssetURLs(body, getURLBasePath(ctx.payload.config.baseURL));

    event.response.headers.set('content-type', 'text/html; charset=utf-8');

    // Clickjacking guard: the SSR auth pages (login, consent, realm-mismatch,
    // logout) mutate state behind explicit clicks and hydrate the logged-in
    // session from first-party cookies. Framing them would make click-gating
    // defeatable via overlay attacks, so deny embedding entirely. (Iframe-based
    // silent renew is therefore unsupported — auth state is JS-readable anyway.)
    event.response.headers.set('content-security-policy', "frame-ancestors 'none'");
    event.response.headers.set('x-frame-options', 'DENY');

    // The auth pages' URLs routinely carry sensitive query params
    // (id_token_hint, code, redirect, state) — never leak them via Referer.
    event.response.headers.set('referrer-policy', 'no-referrer');

    return body;
}

