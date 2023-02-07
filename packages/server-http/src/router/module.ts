/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Router } from 'routup';
import cors from 'cors';
import { registerControllers } from '../controllers';

import { registerErrorMiddleware, registerMiddlewares } from '../middleware';

export function createRouter() : Router {
    const router = new Router();

    router.use(cors({
        origin(origin, callback) {
            callback(null, true);
        },
        credentials: true,
    }));

    registerMiddlewares(router);
    registerControllers(router);
    registerErrorMiddleware(router);

    return router;
}
