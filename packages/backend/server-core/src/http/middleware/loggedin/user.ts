/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { Middleware } from '@decorators/express';
import { UnauthorizedError } from '@typescript-error/http';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../../type';

export function forceUserLoggedIn(
    req: ExpressRequest,
    res: ExpressResponse,
    next: ExpressNextFunction,
) {
    if (
        typeof req.userId === 'undefined'
    ) {
        throw new UnauthorizedError();
    }

    next();
}

export class ForceUserLoggedInMiddleware implements Middleware {
    // eslint-disable-next-line class-methods-use-this
    public use(request: ExpressRequest, response: ExpressResponse, next: ExpressNextFunction) {
        return forceUserLoggedIn(request, response, next);
    }
}
