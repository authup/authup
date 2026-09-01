/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { loadVite } from './source.ts';

/**
 * A vite dev server for one console, in middleware mode so it rides the
 * listener the CLI already built rather than one of its own.
 *
 * `appType` is deliberately `custom`: vite must NOT answer the shell itself,
 * or the console service is bypassed and the theme, the request-reflected
 * `ref` and the console security headers all disappear from dev.
 *
 * `base` is the path the console is actually mounted at, not the fixed base
 * the bundle was built with. Vite then emits every url against the mount, so
 * the service's own asset rebase stays an identity.
 */
export async function createConsoleViteServer(options: {
    packageName: string,
    root: string,
    basePath: string,
    hmrPort: number,
}) : Promise<ViteDevServer> {
    const vite = await loadVite(options.packageName);

    return vite.createServer({
        configFile: path.join(options.root, 'vite.config.ts'),
        root: options.root,
        base: `${options.basePath}/`,
        logLevel: 'warn',
        appType: 'custom',
        server: {
            middlewareMode: true,
            // The HMR socket cannot share the listener: the console mounts
            // run inside server-core's `mount` hook, which fires before the
            // http server exists.
            ws: { port: options.hmrPort },
            watch: {
                usePolling: true,
                interval: 100,
            },
        },
    });
}
