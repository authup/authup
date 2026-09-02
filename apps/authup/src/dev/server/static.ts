/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { IAppEvent } from 'routup';
import type { ViteDevServer } from 'vite';
import { createConsoleViteServer } from './module.ts';
import type { StaticConsoleDevServer } from './types.ts';

/**
 * The shell as vite would serve it: the SOURCE `index.html`, transformed so
 * it carries the HMR client and the un-bundled entry module. Everything the
 * console service does to a shell afterwards (the config splice, the
 * attribute stamping, the theme, the page headers) is unchanged, which is
 * why the dev path is not a second way to serve a console.
 */
export function createViteReadShell(
    vite: Pick<ViteDevServer, 'transformIndexHtml'>,
    root: string,
) : (event: IAppEvent) => Promise<string> {
    return async (event) => {
        const html = await fs.promises.readFile(path.join(root, 'index.html'), 'utf-8');

        // The url reaches every transformIndexHtml hook as its context, so it
        // is the rendered route rather than a fixed '/', as vite's own SSR
        // guide does it.
        return vite.transformIndexHtml(event.path, html);
    };
}

/**
 * A vite dev server for one static console, serving its shell straight from
 * source instead of a built dist.
 */
export async function createStaticConsoleDevServer(options: {
    packageName: string,
    root: string,
    basePath: string,
    hmrPort: number,
}) : Promise<StaticConsoleDevServer> {
    const server = await createConsoleViteServer(options);

    return {
        middlewares: server.middlewares,
        readShell: createViteReadShell(server, options.root),
        close: () => server.close(),
    };
}
