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
// The FILE, not the middleware barrel: the barrel reaches assets.ts, which
// imports the console modules, which call defineStaticConsole at load time.
// Through the barrel that is a cycle that leaves this function undefined.
import { useRequestTheme } from '../../middleware/built-in/theme.ts';
import { applyTheme } from '../theme/index.ts';
import {
    applyUIPageHeaders,
    readUIClientPreferences,
    rebaseAssetURLs,
    replaceTemplateMarker,
    serializeInlineScriptJSON,
    stampHtmlAttributes,
} from '../shared/index.ts';
import type {
    StaticConsole,
    StaticConsoleDefinition,
    StaticConsoleServeOptions,
} from './types.ts';

/**
 * A console shipped as a static SPA bundle (the account console, the admin
 * console): the package's built `index.html` served as the shell for every
 * sub-path, with the runtime configuration spliced in per request.
 *
 * One closure per console, so each keeps its OWN dist and html cache: two
 * consoles sharing a module-level slot would serve one bundle's shell for the
 * other.
 */
export function defineStaticConsole(definition: StaticConsoleDefinition) : StaticConsole {
    let cachedDistPath : string | undefined;
    let cachedHtml : string | undefined;
    let overridePackagePath : string | undefined;

    const resolveDistPath = () : string | undefined => {
        if (cachedDistPath) {
            return cachedDistPath;
        }

        // The node_modules ancestor walk from server-core's own package root
        // finds the package for the workspace symlink and for a published
        // install alike.
        const packagePath = overridePackagePath ?? locateUpSync(
            `node_modules/${definition.packageName}/package.json`,
            { cwd: PACKAGE_PATH },
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
        body = rebaseAssetURLs(body, basePath, definition.viteBase);

        body = await applyTheme(body, useRequestTheme(event), basePath);

        applyUIPageHeaders(event);

        return body;
    };

    return {
        packageName: definition.packageName,
        marker: definition.marker,
        viteBase: definition.viteBase,
        setPackagePath(value: string | undefined) {
            overridePackagePath = value || undefined;
            cachedDistPath = undefined;
            cachedHtml = undefined;
        },
        resolveDistPath,
        serve,
    };
}
