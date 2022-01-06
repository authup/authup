/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import express, { Express } from 'express';
import cors from 'cors';

import path from 'path';
import swaggerUi from 'swagger-ui-express';
import { existsSync } from 'fs';
import { setupExpressMiddlewares } from './utils';
import { ExpressAppCreateContext } from './type';
import { errorMiddleware } from '../middleware/error';
import { registerControllers } from '../controllers';

export function createExpressApp(context: ExpressAppCreateContext) : Express {
    const expressApp : Express = express();

    expressApp.set('trust proxy', 1);

    expressApp.use(cors({
        origin(origin, callback) {
            callback(null, true);
        },
        credentials: true,
    }));

    setupExpressMiddlewares(expressApp, {
        auth: {
            writableDirectoryPath: context.writableDirectoryPath,
        },
        cookieParser: true,
        bodyParser: true,
        response: true,
    });

    if (context.swaggerDocumentation) {
        const swaggerDocumentPath: string = path.join(context.writableDirectoryPath, 'swagger.json');
        if (existsSync(swaggerDocumentPath)) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require, import/no-dynamic-require
            const swaggerDocument = require(swaggerDocumentPath);

            expressApp.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
                swaggerOptions: {
                    withCredentials: true,
                    plugins: [
                        () => ({
                            components: { Topbar: (): any => null },
                        }),
                    ],
                },
            }));
        }
    }

    registerControllers(expressApp, {
        oauth2Provider: {
            selfUrl: context.selfUrl,
            writableDirectoryPath: context.writableDirectoryPath,
            webUrl: context.webUrl,
        },
        token: {
            selfUrl: context.selfUrl,
            writableDirectoryPath: context.writableDirectoryPath,
            maxAge: 3600,
        },
    });

    expressApp.use(errorMiddleware);

    return expressApp;
}
