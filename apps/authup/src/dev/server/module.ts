/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { getPort } from 'get-port-please';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import { HMR_PORT_BASE, HMR_PORT_RANGE } from '../constants.ts';
import { loadVite } from '../package.ts';

/**
 * Vite's own `server.fs.deny` default, restated because supplying the option
 * REPLACES it rather than extending it (verified against vite 8.2.1: passing
 * one pattern leaves exactly that pattern in the resolved config), and vite
 * exports no constant to spread. Keep it in step when the vite floor moves.
 */
const VITE_FS_DENY_DEFAULT = [
    '.env',
    '.env.*',
    '*.{crt,pem,key,p12,pfx,cer,der}',
    '.npmrc',
    '.yarnrc.yml',
    '**/.git/**',
];

/**
 * What a console dev server must never hand out over `/@fs/<absolute path>`.
 *
 * The reach is what makes this necessary rather than cosmetic. A vite dev
 * server ordinarily listens on loopback; in middleware mode it rides the
 * listener the CLI already built, which is server-core's, and that binds
 * `HOST` (`0.0.0.0` in the shipped container). Its `fs.allow` then defaults
 * to the workspace root, so every file in the checkout is readable by anyone
 * who can reach the port. `apps/server-core/writable/db.sql` alone holds
 * `auth_keys.decryption_key` as a plaintext PKCS#8 RSA ACTIVE SIGNING KEY,
 * which is every token this deployment will ever issue, and `authup.yml`
 * holds the database and SMTP credentials next to it.
 *
 * `deny` is the right lever rather than narrowing `fs.allow`: it has higher
 * priority than `allow`, and the allow-list genuinely has to span the whole
 * workspace, since a console's vite config aliases `@authup/client-web-kit`
 * and the two theme packages to their source. Patterns are matched against
 * the ABSOLUTE path with `dot: true`, and a pattern carrying no `/` is
 * prefixed with a wildcard by vite itself.
 *
 * Both `*.sql` and `writable/**` are listed on purpose: the first covers a
 * database wherever it was configured to live, the second covers the
 * hand-made `db.sql.<something>.bak` copies a working checkout accumulates,
 * which no extension pattern catches.
 *
 * This is defence in depth. The primary control is that `authup dev` refuses
 * to start at all when the resolved environment is production.
 */
const CONSOLE_FS_DENY = [
    ...VITE_FS_DENY_DEFAULT,
    '**/*.sql',
    '**/authup.yml',
    '**/.env',
    '**/.env.*',
    '**/writable/**',
];

/**
 * The first free hot-module-replacement socket at or above the base.
 *
 * Called immediately before the server binds it, and never for all three
 * consoles up front: nothing reserves a port between the probe and the bind,
 * so resolving them together would hand the same number to every console.
 * Each dev server is created in turn, so by the time this runs the previous
 * one already holds its port.
 */
export function resolveHmrPort() : Promise<number> {
    return getPort({
        port: HMR_PORT_BASE,
        alternativePortRange: HMR_PORT_RANGE,
    });
}

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
}) : Promise<{ server: ViteDevServer, hmrPort: number }> {
    const vite = await loadVite(options.packageName);

    const hmrPort = await resolveHmrPort();

    const server = await vite.createServer({
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
            ws: { port: hmrPort },
            fs: { deny: CONSOLE_FS_DENY },
            watch: {
                usePolling: true,
                interval: 100,
            },
        },
    });

    return { server, hmrPort };
}
