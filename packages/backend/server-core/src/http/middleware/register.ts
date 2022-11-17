/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Router } from 'routup';
import { createRequestJsonHandler, createRequestUrlEncodedHandler } from '@routup/body';
import { createUIHandler } from '@routup/swagger';
import path from 'path';
import fs from 'fs';
import { merge } from 'smob';
import {
    HTTPMiddlewareOptions,
    HTTPMiddlewareOptionsInput,
    buildHTTPMiddlewareOptions,
    useConfigSync,
} from '../../config';
import { useLogger } from '../../logger';
import { createLoggerMiddleware } from './logger';
import { createMiddleware } from './core';

export function registerMiddlewares(
    router: Router,
    input?: HTTPMiddlewareOptionsInput,
) {
    let options : HTTPMiddlewareOptions;

    const config = useConfigSync();

    if (input) {
        options = merge(
            {},
            buildHTTPMiddlewareOptions(input),
            config.middleware,
        );
    } else {
        options = config.middleware;
    }

    router.use(createLoggerMiddleware());

    if (options.bodyParser) {
        router.use(createRequestJsonHandler());
        router.use(createRequestUrlEncodedHandler({ extended: false }));
    }

    //--------------------------------------------------------------------

    router.use(createMiddleware());

    //--------------------------------------------------------------------

    if (options.swaggerEnabled) {
        const basePath = options.swaggerDirectoryPath || path.join(process.cwd(), 'writable');

        const swaggerDocumentPath: string = path.join(basePath, 'swagger.json');

        if (fs.existsSync(swaggerDocumentPath)) {
            const swaggerDocument = fs.readFileSync(swaggerDocumentPath, { encoding: 'utf-8' });

            router.use('/docs', createUIHandler(JSON.parse(swaggerDocument)));
        } else {
            const logger = useLogger();
            if (logger) {
                logger.warn(`Swagger file ( ${swaggerDocumentPath} ) does not exist.`);
            }
        }
    }
}
