/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Router } from 'routup';
import { registerHTTPControllers } from '../controllers';

import { registerErrorMiddleware, registerHTTPMiddlewares } from '../middleware';

export async function createRouter() : Promise<Router> {
    const router = new Router();

    await registerHTTPMiddlewares(router);
    registerHTTPControllers(router);
    registerErrorMiddleware(router);

    return router;
}
