/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Body, Controller, Delete, Get, Params, Post, Request, Response,
} from '@decorators/express';
import { SwaggerTags } from '@trapi/swagger';
import {
    OAuth2Client,
} from '@authelion/common';
import {
    createOauth2ClientRouteHandler,
    deleteOauth2ClientRouteHandler,
    getManyOauth2ClientRouteHandler,
    getOneOauth2ClientRouteHandler,
    updateOauth2ClientRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('oauth2')
@Controller('/oauth2-client')
export class OAuth2ClientController {
    @Get('', [])
    async getClients(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Client[]> {
        return getManyOauth2ClientRouteHandler(req, res);
    }

    @Get('/:id', [])
    async getClient(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Client> {
        return getOneOauth2ClientRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async editClient(
        @Params('id') id: string,
            @Body() user: NonNullable<OAuth2Client>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<OAuth2Client> {
        return updateOauth2ClientRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async dropClient(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<OAuth2Client> {
        return deleteOauth2ClientRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async addClient(
        @Body() user: NonNullable<OAuth2Client>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<OAuth2Client> {
        return createOauth2ClientRouteHandler(req, res);
    }
}
