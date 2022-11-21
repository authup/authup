/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { HandlerInterface } from '@routup/decorators';
import { Next, Request, Response } from 'routup';
import { UnauthorizedError } from '@ebec/http';
import { useRequestEnv } from '../../utils';

export function forceUserLoggedIn(
    req: Request,
    res: Response,
    next: Next,
) {
    const userId = useRequestEnv(req, 'userId');

    if (
        typeof userId === 'undefined'
    ) {
        throw new UnauthorizedError();
    }

    next();
}

export class ForceUserLoggedInMiddleware implements HandlerInterface {
    // eslint-disable-next-line class-methods-use-this
    public run(request: Request, response: Response, next: Next) {
        return forceUserLoggedIn(request, response, next);
    }
}
