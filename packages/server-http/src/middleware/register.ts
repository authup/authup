/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Router } from 'routup';
import {
    Options as BodyOptions,
    createRequestJsonHandler, createRequestUrlEncodedHandler,
} from '@routup/body';
import {
    ParseOptions as CookieOptions,
    createRequestHandler as createRequestCookieHandler,
} from '@routup/cookie';
import {
    ParseOptions as QueryOptions,
    createRequestHandler as createRequestQueryHandler,
} from '@routup/query';
import { createUIHandler } from '@routup/swagger';
import path from 'path';
import fs from 'fs';
import { useLogger } from '@authup/server-common';
import {
    useConfig,
} from '../config';
import { createLoggerMiddleware } from './logger';
import { createMiddleware } from './core';

export function registerMiddlewares(
    router: Router,
) {
    const config = useConfig();

    router.use(createLoggerMiddleware());

    const middlewareBody = config.get('middlewareBody');
    if (middlewareBody) {
        let options : BodyOptions = {};
        if (typeof middlewareBody !== 'boolean') {
            options = middlewareBody;
        }

        router.use(createRequestJsonHandler(options));
        router.use(createRequestUrlEncodedHandler({ extended: false, ...options }));
    }

    const cookieOptions = config.get('middlewareCookie');
    if (cookieOptions) {
        let options : CookieOptions = {};
        if (typeof cookieOptions !== 'boolean') {
            options = cookieOptions;
        }

        router.use(createRequestCookieHandler(options));
    }

    const queryMiddleware = config.get('middlewareQuery');
    if (queryMiddleware) {
        let options : QueryOptions = {};
        if (typeof queryMiddleware !== 'boolean') {
            options = queryMiddleware;
        }

        router.use(createRequestQueryHandler(options));
    }

    //--------------------------------------------------------------------

    router.use(createMiddleware());

    //--------------------------------------------------------------------

    if (config.get('middlewareSwagger')) {
        const swaggerDocumentPath: string = path.join(config.get('writableDirectoryPath'), 'swagger.json');

        if (fs.existsSync(swaggerDocumentPath)) {
            const swaggerDocument = fs.readFileSync(swaggerDocumentPath, { encoding: 'utf-8' });

            router.use('/docs', createUIHandler(JSON.parse(swaggerDocument)));
        } else {
            useLogger().warn(`Swagger file ( ${swaggerDocumentPath} ) does not exist.`);
        }
    }
}
