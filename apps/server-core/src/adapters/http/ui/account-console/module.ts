/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { InternalError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';
import { locateUpSync } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import { PACKAGE_PATH } from '../../../../path.ts';
import { useRequestTheme } from '../../middleware/index.ts';
import { applyTheme } from '../theme/index.ts';
import {
    applyUIPageHeaders,
    readUIClientPreferences,
    rebaseAssetURLs,
    replaceTemplateMarker,
    serializeInlineScriptJSON,
    stampHtmlAttributes,
} from '../shared/index.ts';
import type { AccountConsoleServeOptions } from './types.ts';

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

    // The injected config is not request-reflected (publicUrl + feature
    // flags, both operator config), but escape like every inline <script>
    // payload.
    const config = {
        apiUrl: options.baseURL,
        basePath: `${basePath}/account`,
        features: options.features,
    };

    let body = replaceTemplateMarker(
        html,
        CONFIG_MARKER,
        `<script>window.__AUTHUP__ = ${serializeInlineScriptJSON(config)};</script>`,
    );

    body = stampHtmlAttributes(body, readUIClientPreferences(event));
    body = rebaseAssetURLs(body, basePath, '/account/');

    body = applyTheme(body, useRequestTheme(event), basePath);

    applyUIPageHeaders(event);

    return body;
}
