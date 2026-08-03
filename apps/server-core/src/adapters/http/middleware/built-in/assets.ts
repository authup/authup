/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { InternalError } from '@authup/errors';
import { read } from 'locter';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import { createHandler } from '@routup/assets';
import path from 'node:path';
import type { App } from 'routup';
import { defineCoreHandler } from 'routup';
import { fromNodeMiddleware } from 'routup/node';
import type * as Vite from 'vite';
import type { ViteDevServer } from 'vite';
import { PACKAGE_PATH } from '../../../../path.ts';
import { resolveAccountConsoleDistPath } from '../../ui/account-console/index.ts';
import { resolveAuthConsoleDistPath, resolveAuthConsolePackagePath } from '../../ui/auth-console/index.ts';

export const VITE_SERVER_STORE_KEY = Symbol('ViteServer');

export async function registerAssetsMiddleware(router: App) {
    // Static assets of the account console SPA (its fixed vite base is
    // /account/). Served in dev mode too — the bundle is prebuilt, not
    // vite-transformed. A missing bundle only disables the mount; the page
    // route reports the actionable error.
    const accountDistPath = resolveAccountConsoleDistPath();
    if (accountDistPath) {
        router.use('account/assets', createHandler(
            path.posix.join(accountDistPath, 'assets'),
            {
                fallthrough: false,
                scan: false,
            },
        ));
    }

    if (!isCodeTransformation(CodeTransformation.JUST_IN_TIME)) {
        router.use('public', createHandler(
            path.posix.join(PACKAGE_PATH, 'public'),
            {
                fallthrough: true,
                scan: false,
            },
        ));

        // Static assets of the auth console SSR bundle (its fixed vite base
        // is /public/). A missing bundle only disables the mount; the page
        // routes report the actionable error.
        const authConsoleDistPath = resolveAuthConsoleDistPath();
        if (authConsoleDistPath) {
            router.use('public', createHandler(
                path.posix.join(authConsoleDistPath, 'client'),
                {
                    fallthrough: false,
                    scan: false,
                },
            ));
        }
        return;
    }

    // JIT (dev) mode serves the auth console straight from the package
    // SOURCE directory (the workspace symlink carries index.html + src/ +
    // vite.config.ts; a published install has no JIT). Vite auto-loads the
    // package's own vite.config.ts from the root.
    const authConsolePackagePath = resolveAuthConsolePackagePath();
    if (!authConsolePackagePath) {
        throw new InternalError(
            'The auth console package (@authup/client-auth-console) is not installed.',
        );
    }

    const vite = await read('vite') as typeof Vite;

    const server: ViteDevServer = await vite.createServer({
        root: authConsolePackagePath,
        base: '/public/',
        logLevel: 'error',
        server: {
            middlewareMode: true,
            watch: {
                usePolling: true,
                interval: 100,
            },
        },
        appType: 'custom',
    });

    router.use('public', fromNodeMiddleware(server.middlewares));
    router.use(defineCoreHandler((event) => {
        event.store[VITE_SERVER_STORE_KEY] = server;
        return event.next();
    }));
}
