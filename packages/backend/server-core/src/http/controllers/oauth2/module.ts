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
import { OAuth2Provider, OAuth2TokenResponse } from '@authelion/common';
import { createTokenRouteHandler, deleteTokenRouteHandler, verifyTokenRouteHandler } from './token';
import { checkAuthorizationCodeRouteHandler } from './authorize';
import { confirmAuthorizationRouteHandler } from './authorize/handlers/confirm';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('oauth2')
@Controller('')
export class OAuth2Controller {
    @Get('/authorize', [])
    async checkAuthorization(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Provider[]> {
        return checkAuthorizationCodeRouteHandler(req, res);
    }

    @Post('/authorize', [ForceLoggedInMiddleware])
    async confirmAuthorization(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Provider[]> {
        return confirmAuthorizationRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @Get('/token', [])
    async getToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Provider[]> {
        return verifyTokenRouteHandler(req, res);
    }

    @Get('/token/:id', [])
    async getTokenById(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Provider[]> {
        return verifyTokenRouteHandler(req, res);
    }

    @Post('/token', [])
    async createToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2TokenResponse[]> {
        return createTokenRouteHandler(req, res);
    }

    @Delete('/token/:id', [])
    async deleteTokenById(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Provider[]> {
        return deleteTokenRouteHandler(req, res);
    }

    @Delete('/token', [])
    async deleteToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Provider[]> {
        return deleteTokenRouteHandler(req, res);
    }
}
