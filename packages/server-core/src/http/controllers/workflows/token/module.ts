/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/protocols';
import {
    DController, DGet, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { createTokenRouteHandler, introspectTokenRouteHandler, revokeTokenRouteHandler } from './handlers';

@DTags('auth')
@DController('/token')
export class TokenController {
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

    @DPost('/revoke', [])
    async revokeToken(
    @DRequest() req: any,
        @DResponse() res: any,
    ) {
        return revokeTokenRouteHandler(req, res);
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
