/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SwaggerTags } from '@trapi/swagger';
import {
    Controller, Delete, Get, Params, Post, Request, Response,
} from '@decorators/express';
import { OAuth2IdentityProvider, OAuth2TokenGrantResponse, Realm } from '@authelion/common';
import { createTokenRouteHandler, deleteTokenRouteHandler, introspectTokenRouteHandler } from './token';
import { runAuthorizationRouteHandler } from './authorize';
import { ForceUserLoggedInMiddleware } from '../../middleware';
import { getJwkRouteHandler, getJwksRouteHandler } from './jwks/handlers';
import { getOpenIdConfigurationRouteHandler } from './openid/handlers';

@SwaggerTags('oauth2')
@Controller('')
export class OAuth2Controller {
    @Post('/authorize', [ForceUserLoggedInMiddleware])
    async confirmAuthorization(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2IdentityProvider[]> {
        return runAuthorizationRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @Get('/token/introspect', [])
    async getIntrospectToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2IdentityProvider[]> {
        return introspectTokenRouteHandler(req, res);
    }

    @Post('/token/introspect', [])
    async postIntrospectToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2IdentityProvider[]> {
        return introspectTokenRouteHandler(req, res);
    }

    @Post('/token', [])
    async createToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2TokenGrantResponse[]> {
        return createTokenRouteHandler(req, res);
    }

    @Delete('/token/:id', [])
    async deleteTokenById(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2IdentityProvider[]> {
        return deleteTokenRouteHandler(req, res);
    }

    @Delete('/token', [])
    async deleteToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2IdentityProvider[]> {
        return deleteTokenRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @Get('/.well_known/openid-configuration', [])
    async getOpenIdConfiguration(
        @Request() req: any,
            @Response() res: any,
    ): Promise<Realm[]> {
        return getOpenIdConfigurationRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @Get('/jwks', [])
    async getManyJwks(
        @Request() req: any,
            @Response() res: any,
    ): Promise<Realm[]> {
        return getJwksRouteHandler(req, res);
    }

    @Get('/jwks/:id', [])
    async getOneJwks(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Realm[]> {
        return getJwkRouteHandler(req, res);
    }
}
