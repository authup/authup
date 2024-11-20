/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DController, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { ForceUserLoggedInMiddleware } from '../../../middleware';
import { runAuthorizationRouteHandler } from './handlers';

@DController('')
export class AuthorizeController {
    @DPost('/authorize', [ForceUserLoggedInMiddleware])
    async confirmAuthorization(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return runAuthorizationRouteHandler(req, res);
    }
}
