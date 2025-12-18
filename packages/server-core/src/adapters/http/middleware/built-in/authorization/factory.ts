/*
 * Copyright (c) 2021-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { coreHandler } from 'routup';
import type { Handler } from 'routup';
import { AuthorizationMiddleware } from './module';
import type { HTTPAuthorizationMiddlewareContext } from './types';

export function createAuthorizationMiddleware(ctx: HTTPAuthorizationMiddlewareContext) : Handler {
    const middleware = new AuthorizationMiddleware(ctx);

    return coreHandler(async (
        request,
        response,
        next,
    ) => middleware.run(request, response, next));
}
