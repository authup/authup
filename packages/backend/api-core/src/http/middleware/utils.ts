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
    createMiddleware,
    responseMiddleware,
} from '../index';
import { Config, useConfigSync } from '../../config';

export function registerMiddlewares(
    router: Application,
    config?: Config,
) {
    config ??= useConfigSync();

    if (config.middleware.bodyParser) {
        router.use(urlencoded({ extended: false }));
        router.use(json());
    }

    router.use(cookieParser());

    if (config.middleware.response) {
        router.use(responseMiddleware);
    }

    //--------------------------------------------------------------------

    router.use(createMiddleware(config));

    //--------------------------------------------------------------------

    if (config.middleware.swagger) {
        const swaggerDocumentPath: string = path.join(config.rootPath, config.writableDirectory, 'swagger.json');

        if (existsSync(swaggerDocumentPath)) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
            const swaggerDocument = require(swaggerDocumentPath);

            router.use(
                '/docs',
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
