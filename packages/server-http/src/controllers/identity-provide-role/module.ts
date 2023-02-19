/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DParam, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { Request, Response } from 'routup';
import { SwaggerTags } from '@trapi/swagger';
import type { IdentityProviderRole } from '@authup/common';
import {
    createOauth2ProviderRoleRouteHandler,
    deleteOauth2ProvideRoleRouteHandler,
    getManyIdentityProviderRoleRouteHandler,
    getOneIdentityProviderRoleRouteHandler,
    updateOauth2ProviderRoleRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('identity-provider')
@DController('/identity-provider-roles')
export class OAuth2ProviderRoleController {
    @DGet('', [])
    async getProviders(
        @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRole[]> {
        return getManyIdentityProviderRoleRouteHandler(req, res);
    }

    @DGet('/:id', [])
    async getProvider(
        @DParam('id') id: string,
            @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRole> {
        return getOneIdentityProviderRoleRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DParam('id') id: string,
            @DBody() user: NonNullable<IdentityProviderRole>,
            @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRole> {
        return updateOauth2ProviderRoleRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DParam('id') id: string,
            @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRole> {
        return deleteOauth2ProvideRoleRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() user: NonNullable<IdentityProviderRole>,
            @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRole> {
        return createOauth2ProviderRoleRouteHandler(req, res);
    }
}
