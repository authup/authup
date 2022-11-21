/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { OAuth2TokenGrantResponse } from '@authelion/common';
import { SwaggerTags } from '@trapi/swagger';
import {
    DController, DGet, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { createTokenRouteHandler, introspectTokenRouteHandler } from './handlers';

@SwaggerTags('auth')
@DController('/token')
export class AuthTokenController {
    @DGet('/introspect', [])
    async getIntrospectToken(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Record<string, any>> {
        return introspectTokenRouteHandler(req, res);
    }

    @DPost('/introspect', [])
    async postIntrospectToken(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Record<string, any>> {
        return introspectTokenRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @DPost('', [])
    async createToken(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<OAuth2TokenGrantResponse[]> {
        return createTokenRouteHandler(req, res);
    }
}
