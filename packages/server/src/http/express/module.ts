/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import express, { Express } from 'express';
import cors from 'cors';

import { errorMiddleware, registerMiddlewares } from '../middleware';
import { ExpressAppCreateContext } from './type';
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

    registerMiddlewares(expressApp, {
        writableDirectoryPath: context.writableDirectoryPath,
        redis: context.redis,

        cookieParserMiddleware: true,
        bodyParserMiddleware: true,
        responseMiddleware: true,
        swaggerMiddleware: {
            writableDirectoryPath: context.writableDirectoryPath,
        },
    });

    registerControllers(expressApp, {
        redis: context.redis,
        tokenMaxAge: context.tokenMaxAge,
        selfUrl: context.selfUrl,
        selfAuthorizeRedirectUrl: context.webUrl,
        writableDirectoryPath: context.writableDirectoryPath,
    });

    // needs to be last :/
    expressApp.use(errorMiddleware);

    return expressApp;
}
