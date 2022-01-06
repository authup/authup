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
import { OAuth2ProviderRole } from '@typescript-auth/common';
import {
    createOauth2ProviderRoleRouteHandler,
    deleteOauth2ProvideRoleRouteHandler,
    getManyOauth2ProviderRoleRouteHandler,
    getOneOauth2ProviderRoleRouteHandler,
    updateOauth2ProviderRoleRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('auth')
@Controller('/oauth2-provider-roles')
export class Oauth2ProviderRoleController {
    @Get('', [])
    async getProviders(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2ProviderRole[]> {
        return getManyOauth2ProviderRoleRouteHandler(req, res);
    }

    @Get('/:id', [])
    async getProvider(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2ProviderRole> {
        return getOneOauth2ProviderRoleRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @Params('id') id: string,
            @Body() user: NonNullable<OAuth2ProviderRole>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2ProviderRole> {
        return updateOauth2ProviderRoleRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2ProviderRole> {
        return deleteOauth2ProvideRoleRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async addProvider(
        @Body() user: NonNullable<OAuth2ProviderRole>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2ProviderRole> {
        return createOauth2ProviderRoleRouteHandler(req, res);
    }
}
