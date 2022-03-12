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
import {
    MiddlewareRegistrationOptions,
    createMiddleware,
    responseMiddleware,
} from '../index';

export function registerMiddlewares(
    router: Application,
    options: MiddlewareRegistrationOptions,
) {
    if (options.bodyParserMiddleware) {
        router.use(urlencoded({ extended: false }));
        router.use(json());
    }

    router.use(cookieParser());

    if (options.responseMiddleware) {
        router.use(responseMiddleware);
    }

    //--------------------------------------------------------------------

    const writableDirectoryPath = options.writableDirectoryPath || path.join(process.cwd(), 'writable');

    router.use(createMiddleware({
        writableDirectoryPath,
        redis: options.redis,
    }));

    //--------------------------------------------------------------------

    if (options.swaggerMiddleware) {
        let docsPath = '/docs';
        let writableDirectoryPath = path.join(process.cwd(), 'writable');

        if (typeof options.swaggerMiddleware !== 'boolean') {
            if (options.swaggerMiddleware.path) {
                docsPath = options.swaggerMiddleware.path;
            }

            if (options.swaggerMiddleware.writableDirectoryPath) {
                writableDirectoryPath = options.swaggerMiddleware.writableDirectoryPath;
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
