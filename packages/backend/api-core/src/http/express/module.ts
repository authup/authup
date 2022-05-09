/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import express, { Express } from 'express';
import cors from 'cors';

import { errorMiddleware, registerMiddlewares } from '../middleware';
import { registerControllers } from '../controllers';

export function createExpressApp() : Express {
    const expressApp : Express = express();

    expressApp.set('trust proxy', 1);

    expressApp.use(cors({
        origin(origin, callback) {
            callback(null, true);
        },
        credentials: true,
    }));

    registerMiddlewares(expressApp);
    registerControllers(expressApp);

    // needs to be last :/
    expressApp.use(errorMiddleware);

    return expressApp;
}
