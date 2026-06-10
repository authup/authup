/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { useRequestCookie } from '@routup/basic/cookie';
import { load } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import type { ViteDevServer } from 'vite';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import { UI_DIST_PATH, UI_SOURCE_PATH } from '../../../path.ts';
import { VITE_SERVER_STORE_KEY } from '../middleware/index.ts';
import type { UIRenderContext } from './types.ts';

const COLOR_MODE_COOKIE = 'vc-color-mode';
const LOCALE_COOKIE = 'vc-locale';

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
        html = await fs.promises.readFile(
            path.join(UI_DIST_PATH, 'client', 'index.html'),
            'utf-8',
        );

        manifest = JSON.parse(await fs.promises.readFile(
            path.join(UI_DIST_PATH, 'client', '.vite', 'ssr-manifest.json'),
            'utf-8',
        ));

        render = (await load(path.join(UI_DIST_PATH, 'server', 'server.js'))).render;
    }

    const [appHtml, preloadLinks] = await render({
        url: ctx.url,
        manifest,
        payload: ctx.payload,
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
    body = body.replace('<html lang="en">', `<html ${htmlAttrs}>`);

    event.response.headers.set('content-type', 'text/html; charset=utf-8');
    return body;
}

/**
 * Open-redirect guard for the `redirect` query parameter carried by the
 * auth workflow pages: only same-origin relative paths pass through.
 */
export function sanitizeRelativeRedirect(input: unknown): string | undefined {
    if (typeof input !== 'string' || input.length === 0) {
        return undefined;
    }

    if (!input.startsWith('/') || input.startsWith('//') || input.startsWith('/\\')) {
        return undefined;
    }

    return input;
}
