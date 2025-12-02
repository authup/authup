/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { OAuth2TokenGrantResponse } from '@authup/specs';
import {
    DController, DGet, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { createTokenRouteHandler, introspectTokenRouteHandler, revokeTokenRouteHandler } from './handlers';
import { toOAuth2Error } from '../../../../../core/oauth2/helpers';

@DTags('auth')
@DController('/token')
export class TokenController {
    @DGet('/introspect', [])
    async getIntrospectToken(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Record<string, any>> {
        try {
            return await introspectTokenRouteHandler(req, res);
        } catch (e) {
            throw toOAuth2Error(e);
        }
    }

    @DPost('/introspect', [])
    async postIntrospectToken(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Record<string, any>> {
        try {
            return await introspectTokenRouteHandler(req, res);
        } catch (e) {
            throw toOAuth2Error(e);
        }
    }

    // ----------------------------------------------------------

    @DPost('/revoke', [])
    async revokeToken(
    @DRequest() req: any,
        @DResponse() res: any,
    ) {
        try {
            return await revokeTokenRouteHandler(req, res);
        } catch (e) {
            throw toOAuth2Error(e);
        }
    }

    // ----------------------------------------------------------

    @DPost('', [])
    async createToken(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<OAuth2TokenGrantResponse[]> {
        try {
            return await createTokenRouteHandler(req, res);
        } catch (e) {
            throw toOAuth2Error(e);
        }
    }
}
