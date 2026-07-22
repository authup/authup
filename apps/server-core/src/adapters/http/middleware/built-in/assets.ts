/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { read } from 'locter';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import { createHandler } from '@routup/assets';
import path from 'node:path';
import type { App } from 'routup';
import { defineCoreHandler } from 'routup';
import { fromNodeMiddleware } from 'routup/node';
import type * as Vite from 'vite';
import type { ViteDevServer } from 'vite';
import { PACKAGE_PATH, UI_DIST_PATH, UI_SOURCE_PATH } from '../../../../path.ts';

export const VITE_SERVER_STORE_KEY = Symbol('ViteServer');

export async function registerAssetsMiddleware(router: App) {
    if (!isCodeTransformation(CodeTransformation.JUST_IN_TIME)) {
        router.use('public', createHandler(
            path.posix.join(PACKAGE_PATH, 'public'),
            {
                fallthrough: true,
                scan: false,
            },
        ));

        router.use('public', createHandler(
            path.posix.join(UI_DIST_PATH, 'client'),
            {
                fallthrough: false,
                scan: false,
            },
        ));
        return;
    }

    const vite = await read('vite') as typeof Vite;

    const server: ViteDevServer = await vite.createServer({
        root: UI_SOURCE_PATH,
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
