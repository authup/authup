/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { InternalError } from '@authup/errors';
import { getURLBasePath } from '@authup/kit';
import { useRequestQuery } from '@routup/basic/query';
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
import { resolveAccountConsoleRef } from './ref.ts';
import type { AccountConsoleServeOptions } from './types.ts';

const CONFIG_MARKER = '<!--account-config-->';

let cachedDistPath: string | undefined;
let cachedHtml: string | undefined;
let overridePackagePath: string | undefined;

/**
 * Point the resolution at a substituted package (config
 * `accountConsolePath`) instead of the node_modules walk. Called once at
 * boot.
 */
export function setAccountConsolePackagePath(value: string | undefined) : void {
    overridePackagePath = value || undefined;
    cachedDistPath = undefined;
    cachedHtml = undefined;
}

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

    const packagePath = overridePackagePath ?? locateUpSync(
        'node_modules/@authup/client-account-console/package.json',
        { cwd: PACKAGE_PATH },
    )?.directory;

    if (packagePath) {
        const distPath = path.join(packagePath, 'dist');

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

    // publicUrl and the feature flags are operator config, but `ref` is
    // request-reflected, so it is validated against the trusted app
    // origins before it goes anywhere near the page.
    //
    // The splice below MUST stay `replaceTemplateMarker`. A plain
    // String.prototype.replace expands `$&`, "$`", `$'` and `$$` inside the
    // REPLACEMENT value, so a crafted `ref` could splice the template's own
    // tail into the payload and break the inline script. That is the exact
    // bug that killed the auth console's hydration payload.
    const config = {
        apiUrl: options.baseURL,
        basePath: `${basePath}/account`,
        features: options.features,
        // This server implements the cookie-mode routes. It is a capability
        // assertion, not a setting: the console pairs it with its own
        // same-origin check before taking that path.
        cookieSession: true,
        ref: resolveAccountConsoleRef(
            useRequestQuery(event, 'ref'),
            options.trustedOrigins,
        ),
    };

    let body = replaceTemplateMarker(
        html,
        CONFIG_MARKER,
        `<script>window.__AUTHUP__ = ${serializeInlineScriptJSON(config)};</script>`,
    );

    body = stampHtmlAttributes(body, readUIClientPreferences(event));
    body = rebaseAssetURLs(body, basePath, '/account/');

    body = await applyTheme(body, useRequestTheme(event), basePath);

    applyUIPageHeaders(event);

    return body;
}
