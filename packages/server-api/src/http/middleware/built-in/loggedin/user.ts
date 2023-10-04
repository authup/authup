/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UnauthorizedError } from '@ebec/http';
import type { HandlerInterface } from '@routup/decorators';
import { useRequestEnv } from 'routup';
import type { Next, Request, Response } from 'routup';

export class ForceUserLoggedInMiddleware implements HandlerInterface {
    // eslint-disable-next-line class-methods-use-this
    public run(request: Request, response: Response, next: Next) {
        const userId = useRequestEnv(request, 'userId');

        if (typeof userId === 'undefined') {
            throw new UnauthorizedError();
        }

        next();
    }
}
