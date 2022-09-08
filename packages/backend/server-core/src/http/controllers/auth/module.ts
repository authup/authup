/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SwaggerTags } from '@trapi/swagger';
import {
    Controller, Get, Params, Post, Request, Response,
} from '@decorators/express';
import {
    OAuth2JsonWebKey,
    OAuth2OpenIDProviderMetadata,
} from '@authelion/common';
import { runAuthorizationRouteHandler } from './authorize';
import { ForceUserLoggedInMiddleware } from '../../middleware';
import { getJwkRouteHandler, getJwksRouteHandler } from './jwks';
import { getOpenIdConfigurationRouteHandler } from './openid';
import {
    createAuthActivateRouteHandler,
    createAuthPasswordForgotRouteHandler,
    createAuthPasswordResetRouteHandler,
    createAuthRegisterRouteHandler,
} from './handlers';

@SwaggerTags('auth')
@Controller('')
export class AuthController {
    @Post('/authorize', [ForceUserLoggedInMiddleware])
    async confirmAuthorization(
        @Request() req: any,
            @Response() res: any,
    ): Promise<void> {
        return runAuthorizationRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @Get('/.well-known/openid-configuration', [])
    async getOpenIdConfiguration(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2OpenIDProviderMetadata[]> {
        return getOpenIdConfigurationRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @Get('/jwks', [])
    async getManyJwks(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2JsonWebKey[]> {
        return getJwksRouteHandler(req, res);
    }

    @Get('/jwks/:id', [])
    async getOneJwks(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2JsonWebKey> {
        return getJwkRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @Post('/activate', [])
    async activate(
        @Request() req: any,
            @Response() res: any,
    ): Promise<void> {
        return createAuthActivateRouteHandler(req, res);
    }

    @Post('/register', [])
    async register(
        @Request() req: any,
            @Response() res: any,
    ): Promise<void> {
        return createAuthRegisterRouteHandler(req, res);
    }

    @Post('/password-forgot', [])
    async forgotPassword(
        @Request() req: any,
            @Response() res: any,
    ): Promise<void> {
        return createAuthPasswordForgotRouteHandler(req, res);
    }

    @Post('/password-reset', [])
    async resetPassword(
        @Request() req: any,
            @Response() res: any,
    ): Promise<void> {
        return createAuthPasswordResetRouteHandler(req, res);
    }
}
