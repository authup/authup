/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import swaggerUi from 'swagger-ui-express';
import { Router } from 'routup';
import { createRequestJsonHandler, createRequestUrlEncodedHandler } from '@routup/body';
import cookieParser from 'cookie-parser';
import path from 'path';
import { existsSync } from 'fs';
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

    router.use(cookieParser());

    //--------------------------------------------------------------------

    router.use(createMiddleware());

    //--------------------------------------------------------------------

    if (options.swaggerEnabled) {
        const basePath = options.swaggerDirectoryPath || path.join(process.cwd(), 'writable');

        const swaggerDocumentPath: string = path.join(basePath, 'swagger.json');

        if (existsSync(swaggerDocumentPath)) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
            const swaggerDocument = require(swaggerDocumentPath);

            for(let i=0; i<swaggerUi.serve.length; i++) {
                router.use('/docs', swaggerUi.serve[i]);
            }

            router.use('/docs',
                swaggerUi.setup(swaggerDocument, {
                    swaggerOptions: {
                        withCredentials: true,
                        plugins: [
                            () => ({
                                components: { Topbar: (): any => null },
                            }),
                        ],
                    },
                }),
            );
        } else {
            const logger = useLogger();
            if (logger) {
                logger.warn(`Swagger file ( ${swaggerDocumentPath} ) does not exist.`);
            }
        }
    }
}
