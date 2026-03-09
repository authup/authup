/*
 * Copyright (c) 2023.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load } from 'locter';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import { createHandler } from '@routup/assets';
import path from 'node:path';
import type { Router } from 'routup';
import { coreHandler, setRequestParam } from 'routup';
import { CLIENT_WEB_SLIM_PACKAGE_PATH, DIST_PATH, PACKAGE_PATH } from '../../../../path.ts';

export async function registerAssetsMiddleware(router: Router) {
    if (!isCodeTransformation(CodeTransformation.JUST_IN_TIME)) {
        router.use('public', createHandler(
            path.posix.join(PACKAGE_PATH, 'public'),
            {
                fallthrough: true,
                scan: false,
            },
        ));

        router.use('public', createHandler(
            path.posix.join(DIST_PATH, 'client'),
            {
                fallthrough: false,
                scan: false,
            },
        ));
        return;
    }

    /**
     * @type import('vite')
     */
    const vite = await load('vite');

    /**
     * @type {import('vite').ViteDevServer}
     */
    const server = await vite.createServer({
        root: CLIENT_WEB_SLIM_PACKAGE_PATH,
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

    router.use('public', coreHandler((req, res, next) => server.middlewares(req, res, next)));
    router.use(coreHandler((req, res, next) => {
        setRequestParam(req, 'viteServer', server);

        next();
    }));
}
