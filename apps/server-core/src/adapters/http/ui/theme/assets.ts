/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { Handler } from 'routup';
import { HeaderName, defineCoreHandler, sendFile } from 'routup';
import {
    THEME_ASSET_CONTENT_TYPES,
    THEME_ASSET_CSP,
    THEME_ASSET_EXTENSIONS,
} from './constants.ts';
import type { IThemeProvider } from './types.ts';

const REQUEST_PATH_PATTERN = /^[a-z0-9][a-z0-9._/-]*$/i;

/**
 * Serves the operator theme's `assets/` directory.
 *
 * Deliberately NOT `@routup/assets`' createHandler, for three reasons that
 * matter for an operator-supplied root:
 * - its lookup walks PATH SUFFIXES, so `/theme/anything/logo.svg` would
 *   serve `/logo.svg`; the same file becomes reachable at unbounded
 *   distinct URLs.
 * - it probes `.html` / `index.html` by default, which would make a stray
 *   index.html a servable document on the IdP origin.
 * - it performs no realpath containment check, so a symlink inside the
 *   mounted directory pointing outside it is served with a 200. A
 *   read-only mount does not prevent that, and refusing symlinks outright
 *   is not an option: a Kubernetes ConfigMap volume IS a symlink farm
 *   (`key -> ..data/key`).
 */
export function createThemeAssetsHandler(provider: IThemeProvider) : Handler {
    return defineCoreHandler(async (event) => {
        const assetsPath = provider.getAssetsPath();
        if (!assetsPath) {
            event.response.status = 404;

            return null;
        }

        let requestPath = event.path;
        const { mountPath } = event;
        if (requestPath.startsWith(mountPath)) {
            requestPath = requestPath.substring(mountPath.length);
        }

        if (requestPath.includes('%')) {
            try {
                requestPath = decodeURIComponent(requestPath);
            } catch {
                event.response.status = 404;

                return null;
            }
        }

        requestPath = requestPath.replace(/^\/+/, '');

        const extension = path.extname(requestPath).toLowerCase();

        if (
            !requestPath ||
            !REQUEST_PATH_PATTERN.test(requestPath) ||
            requestPath.split('/').includes('..') ||
            !(THEME_ASSET_EXTENSIONS as readonly string[]).includes(extension)
        ) {
            event.response.status = 404;

            return null;
        }

        // Both the root and the file are realpathed HERE, per request, and
        // never cached. A Kubernetes ConfigMap update swaps the `..data`
        // symlink to a new timestamped directory and deletes the old one,
        // so a root realpath captured at boot dangles after the first
        // update and every asset 404s until the pod restarts.
        //
        // The realpath is also the control that survives a symlink pointing
        // out of the mount; the pattern check above is only the cheap first
        // pass. Resolving both within the same request keeps the comparison
        // consistent: a swap landing between the two calls fails closed
        // (a transient 404), never open.
        let root : string;
        let filePath : string;
        let stats : fs.Stats;
        try {
            root = await fs.promises.realpath(assetsPath);
            filePath = await fs.promises.realpath(path.join(assetsPath, requestPath));
            stats = await fs.promises.stat(filePath);
        } catch {
            event.response.status = 404;

            return null;
        }

        if (
            !stats.isFile() ||
            (filePath !== root && !filePath.startsWith(root + path.sep))
        ) {
            event.response.status = 404;

            return null;
        }

        const etag = `W/"${stats.size}-${stats.mtime.getTime()}"`;
        event.response.headers.set(HeaderName.CACHE_CONTROL, 'public, max-age=0, must-revalidate');

        if (event.headers.get(HeaderName.IF_NONE_MATCH) === etag) {
            event.response.status = 304;

            return null;
        }

        const response = await sendFile(event, {
            content: (options) => Readable.toWeb(
                fs.createReadStream(filePath, options),
            ) as ReadableStream,
            stats: () => stats,
            name: filePath,
        });

        // Pin the content type from our own extension map rather than
        // letting it be sniffed or inferred, and neutralize SVG as active
        // content (an SVG navigated to directly executes inline script).
        response.headers.set(HeaderName.CONTENT_TYPE, THEME_ASSET_CONTENT_TYPES[extension]);
        response.headers.set('x-content-type-options', 'nosniff');
        response.headers.set('content-security-policy', THEME_ASSET_CSP);

        return response;
    });
}
