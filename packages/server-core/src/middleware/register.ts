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
import { useLogger } from '@authelion/server-common';
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

    if (config.get('middlewareBody')) {
        router.use(createRequestJsonHandler());
        router.use(createRequestUrlEncodedHandler({ extended: false }));
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
            const logger = useLogger();
            if (logger) {
                logger.warn(`Swagger file ( ${swaggerDocumentPath} ) does not exist.`);
            }
        }
    }
}
