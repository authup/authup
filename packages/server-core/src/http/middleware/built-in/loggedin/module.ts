/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UnauthorizedError } from '@ebec/http';
import type { HandlerInterface } from '@routup/decorators';
import type {
    Next, Request, Response,
} from 'routup';
import { useRequestEnv } from '../../../request';

export function isRequestAuthenticated(req: Request) {
    return typeof useRequestEnv(req, 'userId') !== 'undefined' ||
        typeof useRequestEnv(req, 'robotId') !== 'undefined' ||
        typeof useRequestEnv(req, 'clientId') !== 'undefined';
}

export class ForceLoggedInMiddleware implements HandlerInterface {
    // eslint-disable-next-line class-methods-use-this
    public run(request: Request, response: Response, next: Next) {
        if (isRequestAuthenticated(request)) {
            next();
            return;
        }

        throw new UnauthorizedError();
    }
}
