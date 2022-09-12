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
import { OAuth2RefreshToken, OAuth2TokenGrantResponse } from '@authelion/common';
import { createTokenRouteHandler, introspectTokenRouteHandler } from './handlers';

@SwaggerTags('auth')
@Controller('/token')
export class AuthTokenController {
    @Get('/introspect', [])
    async getIntrospectToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<Record<string, any>> {
        return introspectTokenRouteHandler(req, res);
    }

    @Post('/introspect', [])
    async postIntrospectToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<Record<string, any>> {
        return introspectTokenRouteHandler(req, res);
    }

    // ----------------------------------------------------------

    @Post('', [])
    async createToken(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2TokenGrantResponse[]> {
        return createTokenRouteHandler(req, res);
    }
}
