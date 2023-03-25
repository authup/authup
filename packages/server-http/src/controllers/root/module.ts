/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DController, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type {
    OAuth2JsonWebKey,
    OAuth2OpenIDProviderMetadata,
} from '@authup/common';
import { runAuthorizationRouteHandler } from './authorize';
import { ForceUserLoggedInMiddleware } from '../../middleware';
import { getJwkRouteHandler, getJwksRouteHandler } from './jwks';
import { getOpenIdConfigurationRouteHandler } from './openid';
import {
    createAuthActivateRouteHandler,
    createAuthPasswordForgotRouteHandler,
    createAuthPasswordResetRouteHandler,
    createAuthRegisterRouteHandler,
} from './base';

@DTags('root')
@DController('')
export class RootController {
    @DPost('/authorize', [ForceUserLoggedInMiddleware])
    async confirmAuthorization(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return runAuthorizationRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @DGet('/.well-known/openid-configuration', [])
    async getOpenIdConfiguration(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<OAuth2OpenIDProviderMetadata[]> {
        return getOpenIdConfigurationRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @DGet('/jwks', [])
    async getManyJwks(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<OAuth2JsonWebKey[]> {
        return getJwksRouteHandler(req, res);
    }

    @DGet('/jwks/:id', [])
    async getOneJwks(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<OAuth2JsonWebKey> {
        return getJwkRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @DPost('/activate', [])
    async activate(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return createAuthActivateRouteHandler(req, res);
    }

    @DPost('/register', [])
    async register(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return createAuthRegisterRouteHandler(req, res);
    }

    @DPost('/password-forgot', [])
    async forgotPassword(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return createAuthPasswordForgotRouteHandler(req, res);
    }

    @DPost('/password-reset', [])
    async resetPassword(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return createAuthPasswordResetRouteHandler(req, res);
    }
}
