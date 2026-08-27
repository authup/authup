/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { InternalError } from '@authup/errors';
import { locateUpSync } from 'locter';
import fs from 'node:fs';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import {
    applyUIPageHeaders,
    readUIClientPreferences,
    rebaseAssetURLs,
    replaceTemplateMarker,
    serializeInlineScriptJSON,
    stampHtmlAttributes,
} from './html';
import { applyTheme } from './theme/index';
import type {
    StaticConsole,
    StaticConsoleDefinition,
    StaticConsoleServeOptions,
} from './types';

/**
 * A console shipped as a static SPA bundle (the account console, the admin
 * console): the package's built `index.html` served as the shell for every
 * sub-path, with the runtime configuration spliced in per request.
 *
 * One closure per console AND per handler: every piece of state below is
 * instance-scoped, so two applications in one process never share a
 * substituted package path or a resolved dist.
 */
export function defineStaticConsole(definition: StaticConsoleDefinition) : StaticConsole {
    let cachedDistPath : string | undefined;

    const resolveDistPath = () : string | undefined => {
        if (cachedDistPath) {
            return cachedDistPath;
        }

        // The node_modules ancestor walk from the SERVING package's own root
        // finds the console package for the workspace symlink and for a
        // published install alike. The anchor is behavioural: it decides
        // which node_modules tree is walked, so it is never the process cwd.
        const packagePath = definition.distPath || locateUpSync(
            `node_modules/${definition.packageName}/package.json`,
            { cwd: definition.cwd },
        )?.directory;

        if (packagePath) {
            const distPath = path.join(packagePath, 'dist');

            if (fs.existsSync(path.join(distPath, 'index.html'))) {
                cachedDistPath = distPath;
            }
        }

        return cachedDistPath;
    };

    const serve = async (event: IAppEvent, options: StaticConsoleServeOptions) : Promise<string> => {
        const distPath = resolveDistPath();
        if (!distPath) {
            throw new InternalError(
                `The console bundle (${definition.packageName}) is not built or installed.`,
            );
        }

        // Read per request rather than cached: the shell is a few kilobytes
        // read once per full document load, and a rebuilt bundle is then
        // picked up without a restart. That is what the retired just-in-time
        // branch bought, at the price of a typeorm dependency inside a
        // page-serving package.
        const html = await fs.promises.readFile(path.join(distPath, 'index.html'), 'utf-8');

        // The splice below MUST stay `replaceTemplateMarker`. A plain
        // String.prototype.replace expands `$&`, "$`", `$'` and `$$` inside
        // the REPLACEMENT value, and the config may carry request-reflected
        // values (the account console's `ref`), so a crafted one could splice
        // the template's own tail into the payload and break the inline
        // script. That is the exact bug that killed the auth console's
        // hydration payload.
        let body = replaceTemplateMarker(
            html,
            definition.marker,
            `<script>window.__AUTHUP__ = ${serializeInlineScriptJSON(options.config)};</script>`,
        );

        body = stampHtmlAttributes(body, readUIClientPreferences(event));
        body = rebaseAssetURLs(body, options.basePath, definition.viteBase);

        body = await applyTheme(body, options.theme, options.basePath);

        applyUIPageHeaders(event);

        return body;
    };

    return {
        packageName: definition.packageName,
        marker: definition.marker,
        viteBase: definition.viteBase,
        resolveDistPath,
        serve,
    };
}
