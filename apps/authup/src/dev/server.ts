/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import net from 'node:net';
import path from 'node:path';
import type { Handler, IAppEvent } from 'routup';
import { defineCoreHandler } from 'routup';
import type { ViteDevServer } from 'vite';
import { loadVite } from './source.ts';

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
 * The one path a console dev server must never answer.
 *
 * Vite registers `middlewares.use('/__open-in-editor', launchEditorMiddleware())`
 * UNCONDITIONALLY (vite 8.2.1), and that middleware spawns a child process:
 * `launch-editor` runs `process.env.LAUNCH_EDITOR` (or a guessed editor) with
 * a caller-chosen path. It is a side-effecting endpoint reachable by a plain
 * GET, so any page a developer visits can fire it cross-origin with
 * `<img src="http://localhost:3000/console/admin/__open-in-editor?file=...">`.
 * Vite's own host allowlist does not defend it: that check sees
 * `Host: localhost`, which is exactly what such a request carries.
 *
 * The refusal sits in FRONT of `fromNodeMiddleware` rather than reaching into
 * vite's middleware stack, so it survives a vite upgrade reordering or
 * renaming its internals.
 *
 * The comparison must be case-insensitive. Connect's own dispatch (vite
 * 8.2.1, `node_modules/vite/dist/node/chunks/node.js:7038`) matches a route
 * with `path.toLowerCase().substr(0, route.length) !== route.toLowerCase()`,
 * so `/__OPEN-IN-EDITOR` reaches the middleware exactly as `/__open-in-editor`
 * does. A literal segment comparison here would refuse the spelling connect
 * matches loosely while letting every other casing walk straight past it.
 */
export function createOpenInEditorGuard() : Handler {
    return defineCoreHandler((event: IAppEvent) => {
        const segments = event.path.split('/').map((segment) => segment.toLowerCase());

        if (segments.includes('__open-in-editor')) {
            event.response.status = 404;

            return null;
        }

        return event.next();
    });
}

/**
 * Refuse a hot-module-replacement port that is already taken.
 *
 * Vite reports an occupied ws port through `config.logger.error` and then
 * CARRIES ON, so the console comes up with no HMR at all while this command
 * has already announced it as hot. A dev loop that lies about being hot costs
 * more than one that refuses to start: the symptom is edits that silently
 * stop applying, which reads as a broken build rather than a busy port.
 *
 * The probe binds exactly as vite's ws server does (`listen(port)` with no
 * host, so every interface), or it would answer a different question from the
 * one the dev server is about to ask.
 */
async function assertHmrPortFree(port: number, packageName: string) : Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const probe = net.createServer();

        probe.once('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
                reject(new AuthupError(
                    `The hot module replacement port ${port} for ${packageName} is already in use. ` +
                    'Another `authup dev` is most likely still running; stop it and start again.',
                ));

                return;
            }

            reject(error);
        });

        probe.once('listening', () => {
            probe.close(() => resolve());
        });

        probe.listen(port);
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
    hmrPort: number,
}) : Promise<ViteDevServer> {
    const vite = await loadVite(options.packageName);

    await assertHmrPortFree(options.hmrPort, options.packageName);

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
            fs: { deny: CONSOLE_FS_DENY },
            watch: {
                usePolling: true,
                interval: 100,
            },
        },
    });
}
