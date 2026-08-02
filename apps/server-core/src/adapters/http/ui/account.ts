/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { StatusResponseFeatures } from '@authup/core-http-kit';
import { InternalError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';
import { useRequestCookie } from '@routup/basic/cookie';
import { locateUpSync } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import { PACKAGE_PATH } from '../../../path.ts';
import { LOCALE_COOKIE } from '../request/helpers/locale.ts';
import { rebaseAccountAssetURLs } from './base-path.ts';

const COLOR_MODE_COOKIE = 'vc-color-mode';
const CONFIG_MARKER = '<!--account-config-->';

let cachedDistPath: string | undefined;
let cachedHtml: string | undefined;

/**
 * Locate the built account console bundle. The SPA ships as the
 * `@authup/client-account-console` package (a server-core dependency), so
 * the node_modules ancestor walk from server-core's own package root
 * (locter's `locateUp`) finds it for the workspace (symlink onto
 * apps/client-account-console) and for a published install alike. Only a
 * positive result is cached — a dev building the app after boot is picked
 * up on the next request.
 */
export function resolveAccountConsoleDistPath() : string | undefined {
    if (cachedDistPath) {
        return cachedDistPath;
    }

    const manifest = locateUpSync(
        'node_modules/@authup/client-account-console/package.json',
        { cwd: PACKAGE_PATH },
    );
    if (manifest) {
        const distPath = path.join(manifest.directory, 'dist');

        if (fs.existsSync(path.join(distPath, 'index.html'))) {
            cachedDistPath = distPath;
        }
    }

    return cachedDistPath;
}

// The injected config is not request-reflected (publicUrl + feature flags,
// both operator config), but escape like every inline <script> payload —
// never rely on the VALUES staying benign.
function serializeConfig(config: unknown) : string {
    return JSON.stringify(config)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
}

export type AccountConsoleServeOptions = {
    baseURL: string,
    features: StatusResponseFeatures,
};

/**
 * Serve the account console SPA shell: the package's built index.html with
 * the runtime configuration injected (replacing the `<!--account-config-->`
 * marker), the color-mode/lang attributes stamped from the shared cookies
 * (no flash), and asset hrefs rebased when publicUrl carries a sub-path.
 * Client-side routing owns everything below /account — the shell is the
 * same for every sub-path.
 */
export async function serveAccountConsolePage(
    event: IAppEvent,
    options: AccountConsoleServeOptions,
) : Promise<string> {
    const distPath = resolveAccountConsoleDistPath();
    if (!distPath) {
        throw new InternalError(
            'The account console bundle (@authup/client-account-console) is not built or installed.',
        );
    }

    let html : string;
    if (isCodeTransformation(CodeTransformation.JUST_IN_TIME)) {
        // dev: re-read so a rebuilt bundle is picked up without a restart
        html = await fs.promises.readFile(path.join(distPath, 'index.html'), 'utf-8');
    } else {
        html = (cachedHtml ??= await fs.promises.readFile(
            path.join(distPath, 'index.html'),
            'utf-8',
        ));
    }

    const basePath = getURLBasePath(options.baseURL);

    const config = {
        apiUrl: options.baseURL,
        basePath: `${basePath}/account`,
        features: options.features,
    };

    let body = html.replace(
        CONFIG_MARKER,
        `<script>window.__AUTHUP_ACCOUNT__ = ${serializeConfig(config)};</script>`,
    );

    // Mirror renderUIPage: resolve the shared cookies server-side so the
    // HTML shell already carries the `.dark`/`.light` class and lang
    // attribute (no flash) before the client app takes over.
    const locale = useRequestCookie(event, LOCALE_COOKIE);
    const colorMode = useRequestCookie(event, COLOR_MODE_COOKIE);

    let htmlAttrs = 'lang="en"';
    if (locale && /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]+)*$/.test(locale)) {
        htmlAttrs = `lang="${locale}"`;
    }
    if (colorMode === 'dark' || colorMode === 'light') {
        htmlAttrs += ` class="${colorMode}"`;
    }
    body = body.replace(/<html\b[^>]*>/i, `<html ${htmlAttrs}>`);

    body = rebaseAccountAssetURLs(body, basePath);

    event.response.headers.set('content-type', 'text/html; charset=utf-8');

    // Same posture as the SSR auth pages (see renderUIPage): the surface
    // mutates state behind explicit clicks and reads first-party session
    // cookies — deny framing entirely, and never leak query params
    // (code, state, error) via Referer.
    event.response.headers.set('content-security-policy', "frame-ancestors 'none'");
    event.response.headers.set('x-frame-options', 'DENY');
    event.response.headers.set('referrer-policy', 'no-referrer');

    return body;
}
