/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import swaggerUi from 'swagger-ui-express';
import { Application, json, urlencoded } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { existsSync } from 'fs';
import { Client } from 'redis-extension';
import {
    MiddlewareRegistrationOptions,
    responseMiddleware,
    setupMiddleware,
} from '../index';

export function registerMiddlewares(
    router: Application,
    options: MiddlewareRegistrationOptions,
) {
    if (options.bodyParser) {
        router.use(urlencoded({ extended: false }));
        router.use(json());
    }

    router.use(cookieParser());

    if (options.response) {
        router.use(responseMiddleware);
    }

    if (options.auth) {
        let writableDirectoryPath = path.join(process.cwd(), 'writable');

        let redis: Client | boolean | string | undefined;

        if (typeof options.auth !== 'boolean') {
            if (options.auth.writableDirectoryPath) {
                writableDirectoryPath = options.auth.writableDirectoryPath;
            }

            redis = options.auth.redis;
        }

        router.use(setupMiddleware({
            writableDirectoryPath,
            redis,
        }));
    }

    if (options.swaggerDocumentation) {
        let docsPath = '/docs';
        let writableDirectoryPath = path.join(process.cwd(), 'writable');

        if (typeof options.swaggerDocumentation !== 'boolean') {
            if (options.swaggerDocumentation.path) {
                docsPath = options.swaggerDocumentation.path;
            }

            if (options.swaggerDocumentation.writableDirectoryPath) {
                writableDirectoryPath = options.swaggerDocumentation.writableDirectoryPath;
            }
        }

        const swaggerDocumentPath: string = path.join(writableDirectoryPath, 'swagger.json');

        if (existsSync(swaggerDocumentPath)) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
            const swaggerDocument = require(swaggerDocumentPath);

            router.use(
                docsPath,
                swaggerUi.serve,
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
        }
    }
}
