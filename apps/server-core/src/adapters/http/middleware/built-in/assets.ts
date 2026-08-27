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
import fs from 'node:fs';
import path from 'node:path';
import type { App } from 'routup';
import { defineCoreHandler } from 'routup';
import { fromNodeMiddleware } from 'routup/node';
import type * as Vite from 'vite';
import type { ViteDevServer } from 'vite';
import { resolveAccountConsoleDistPath } from '../../ui/account-console/index.ts';
import { resolveAdminConsoleDistPath } from '../../ui/admin-console/index.ts';
import { resolveAuthConsoleDistPath, resolveAuthConsolePackagePath } from '../../ui/auth-console/index.ts';
import {
    ACCOUNT_CONSOLE_SEGMENT,
    ADMIN_CONSOLE_SEGMENT,
    AUTH_CONSOLE_SEGMENT,
} from '../../ui/constants.ts';
import { THEME_ASSET_MOUNT_PATH, ThemeProvider, createThemeAssetsHandler } from '@authup/server-console-kit';
import { registerThemeMiddleware } from './theme.ts';
import type { AssetsMiddlewareOptions } from './types.ts';

export const VITE_SERVER_STORE_KEY = Symbol('ViteServer');

/**
 * Returns the vite dev server it created (JIT mode only), so the caller can
 * close it on teardown. It owns a file watcher and an HMR websocket, which
 * outlive the http listener otherwise.
 */
export async function registerAssetsMiddleware(
    router: App,
    options: AssetsMiddlewareOptions = {},
) : Promise<ViteDevServer | undefined> {
    // Mounted FIRST, and outside the JIT early-return below, so an
    // operator theme applies in dev mode too. An invalid manifest throws
    // here and fails the boot.
    await registerThemeAssets(router, options);

    // Static assets of the account console SPA (its fixed vite base is
    // /console/account/). Served in dev mode too: the bundle is prebuilt, not
    // vite-transformed. A missing bundle only disables the mount; the page
    // route reports the actionable error.
    // Every file under a vite `assets/` output carries a content hash in its
    // name, so a client may cache it for as long as it likes: a new build
    // means new names. Without this the default `max-age=0, must-revalidate`
    // re-requested all 140+ files on every full document load.
    const immutable = {
        fallthrough: false,
        scan: false,
        cacheMaxAge: 60 * 60 * 24 * 365,
        cacheImmutable: true,
    };

    const accountDistPath = resolveAccountConsoleDistPath();
    if (accountDistPath) {
        router.use(`${ACCOUNT_CONSOLE_SEGMENT}/assets`, createHandler(
            path.posix.join(accountDistPath, 'assets'),
            immutable,
        ));
    }

    // The admin console SPA, same shape.
    const adminDistPath = resolveAdminConsoleDistPath();
    if (adminDistPath) {
        router.use(`${ADMIN_CONSOLE_SEGMENT}/assets`, createHandler(
            path.posix.join(adminDistPath, 'assets'),
            immutable,
        ));
    }

    // Logged because the gate is implicit (a ts-node/tsx loader detected from
    // the process arguments, see `cli-dev`) and a dark gate is otherwise
    // indistinguishable from a working one (#3382).
    const isJIT = isCodeTransformation(CodeTransformation.JUST_IN_TIME);
    options.logger?.info(`Serving the auth console from ${isJIT ? 'source (vite dev server)' : 'the package dist'}.`);

    if (!isJIT) {
        // Static assets of the auth console SSR bundle (its fixed vite base
        // is /console/auth/, so the same <segment>/assets shape as the two
        // static consoles; the pages stay on their protocol routes). Only
        // the assets directory is mounted, never dist/client itself: the
        // template and the ssr manifest are inputs of the render, not files
        // to serve. A missing bundle only disables the mount; the page
        // routes report the actionable error.
        const authConsoleDistPath = resolveAuthConsoleDistPath();
        if (authConsoleDistPath) {
            router.use(`${AUTH_CONSOLE_SEGMENT}/assets`, createHandler(
                path.posix.join(authConsoleDistPath, 'client', 'assets'),
                {
                    fallthrough: false,
                    scan: false,
                },
            ));
        }
        return undefined;
    }

    // JIT (dev) mode serves the auth console straight from the package
    // SOURCE directory (the workspace symlink carries index.html + src/ +
    // vite.config.ts; a published install has no JIT). Vite auto-loads the
    // package's own vite.config.ts from the root. The dev server is mounted
    // on the whole console segment rather than its assets/ sub-path: in dev
    // vite serves its client (`/console/auth/@vite/client`) and the source
    // modules under the BASE, and none of them lives under assets/.
    const authConsolePackagePath = resolveAuthConsolePackagePath();
    if (!authConsolePackagePath) {
        throw new InternalError(
            'The auth console package (@authup/client-auth-console) is not installed.',
        );
    }

    const vite = await read('vite') as typeof Vite;

    const server: ViteDevServer = await vite.createServer({
        root: authConsolePackagePath,
        base: `/${AUTH_CONSOLE_SEGMENT}/`,
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

    router.use(AUTH_CONSOLE_SEGMENT, fromNodeMiddleware(server.middlewares));
    router.use(defineCoreHandler((event) => {
        event.store[VITE_SERVER_STORE_KEY] = server;
        return event.next();
    }));

    return server;
}

/**
 * Load the operator theme and mount its `assets/` directory at /theme.
 *
 * A missing directory disables the feature entirely: no provider is
 * created, no middleware is registered, and both console serve paths keep
 * returning byte-identical un-themed pages. So the default configuration
 * pays nothing, not even a per-request core handler.
 */
async function registerThemeAssets(router: App, options: AssetsMiddlewareOptions) : Promise<void> {
    const { themeDirectoryPath } = options;
    if (!themeDirectoryPath || !fs.existsSync(themeDirectoryPath)) {
        return;
    }

    const provider = new ThemeProvider({
        directoryPath: themeDirectoryPath,
        fragmentsEnabled: options.themeFragmentsEnabled,
        logger: options.logger,
    });

    await provider.load();

    registerThemeMiddleware(router, provider);

    router.use(THEME_ASSET_MOUNT_PATH, createThemeAssetsHandler(provider));
}
