/*
 * Copyright (c) 2022-2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { UnauthorizedError } from '@ebec/http';
import type { HandlerInterface } from '@routup/decorators';
import type { Next, Request, Response } from 'routup';
import { useRequestIdentity } from '../../../request';

export class ForceUserLoggedInMiddleware implements HandlerInterface {
    // eslint-disable-next-line class-methods-use-this
    public run(request: Request, response: Response, next: Next) {
        const identity = useRequestIdentity(request);

        if (!identity || identity.type !== 'user') {
            throw new UnauthorizedError();
        }

        next();
    }
}
