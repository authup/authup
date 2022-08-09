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
import { IdentityProviderRole } from '@authelion/common';
import {
    createOauth2ProviderRoleRouteHandler,
    deleteOauth2ProvideRoleRouteHandler,
    getManyIdentityProviderRoleRouteHandler,
    getOneIdentityProviderRoleRouteHandler,
    updateOauth2ProviderRoleRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('identity-provider')
@Controller('/identity-provider-roles')
export class OAuth2ProviderRoleController {
    @Get('', [])
    async getProviders(
        @Request() req: any,
            @Response() res: any,
    ): Promise<IdentityProviderRole[]> {
        return getManyIdentityProviderRoleRouteHandler(req, res);
    }

    @Get('/:id', [])
    async getProvider(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<IdentityProviderRole> {
        return getOneIdentityProviderRoleRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @Params('id') id: string,
            @Body() user: NonNullable<IdentityProviderRole>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<IdentityProviderRole> {
        return updateOauth2ProviderRoleRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<IdentityProviderRole> {
        return deleteOauth2ProvideRoleRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async addProvider(
        @Body() user: NonNullable<IdentityProviderRole>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<IdentityProviderRole> {
        return createOauth2ProviderRoleRouteHandler(req, res);
    }
}
