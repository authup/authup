/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DController, DGet, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { ForceUserLoggedInMiddleware } from '../../../middleware';
import { confirmAuthorizationRouteHandler, serveAuthorizationRouteHandler } from './handlers';

@DController('')
export class AuthorizeController {
    // todo: maybe /realms/<realm>/protocol/openid-connect/authorize
    // todo: maybe /realms/<realm>/[...]/authorize
    @DPost('/authorize', [ForceUserLoggedInMiddleware])
    async confirm(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return confirmAuthorizationRouteHandler(req, res);
    }

    @DGet('/authorize', [])
    async serve(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return serveAuthorizationRouteHandler(req, res);
    }
}
