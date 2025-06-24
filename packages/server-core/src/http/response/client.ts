/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { load } from 'locter';
import type { Request, Response } from 'routup';
import { send, useRequestParam } from 'routup';
import fs from 'node:fs';
import path from 'node:path';
import { CodeTransformation, isCodeTransformation } from 'typeorm-extension';
import { useConfig } from '../../config';
import { resolvePackagePath } from '../../path';

type ClientAppResponseOptions = {
    data?: Record<string, any>,
    path?: string,
};
export async function sendClientResponse(
    req: Request,
    res: Response,
    options: ClientAppResponseOptions = {},
) {
    const config = useConfig();

    const isJIT = isCodeTransformation(CodeTransformation.JUST_IN_TIME);

    const payload = {
        config: {
            baseURL: config.publicUrl,
        },
        data: options.data || {},
    };

    let html : string;
    let manifest : Record<string, any>;
    let render : CallableFunction;

    if (isJIT) {
        /**
         * @type {import('vite').ViteDevServer}
         */
        const vite = useRequestParam(req, 'viteServer');

        html = await fs.promises.readFile(
            path.join(resolvePackagePath(), 'client', 'index.html'),
            'utf-8',
        );
        html = await vite.transformIndexHtml('/', html);
        manifest = {};
        render = (await vite.ssrLoadModule('/src/server.js')).render;
    } else {
        html = await fs.promises.readFile(
            path.join(resolvePackagePath(), 'public', 'index.html'),
            'utf-8',
        );

        manifest = JSON.parse(await fs.promises.readFile(
            path.join(resolvePackagePath(), 'public', '.vite', 'ssr-manifest.json'),
            'utf-8',
        ));

        render = (await load('./client/dist/server/server.mjs')).render;
    }

    const [appHtml, preloadLinks] = await render({
        url: options.path || '/',
        manifest,
        payload,
    });

    return send(
        res,
        html
            .replace('<!--preload-links-->', preloadLinks)
            .replace('<!--app-html-->', appHtml),
    );
}
