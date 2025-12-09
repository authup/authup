/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { Request, Response } from 'routup';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import {
    createOauth2ProviderRoleRouteHandler,
    deleteOauth2ProvideRoleRouteHandler,
    getManyIdentityProviderRoleRouteHandler,
    getOneIdentityProviderRoleRouteHandler,
    updateOauth2ProviderRoleRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../../middleware';

@DTags('identity-provider')
@DController('/identity-provider-role-mappings')
export class OAuth2ProviderRoleController {
    @DGet('', [])
    async getProviders(
        @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRoleMapping[]> {
        return getManyIdentityProviderRoleRouteHandler(req, res);
    }

    @DGet('/:id', [])
    async getProvider(
        @DPath('id') id: string,
            @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRoleMapping> {
        return getOneIdentityProviderRoleRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DPath('id') id: string,
            @DBody() user: NonNullable<IdentityProviderRoleMapping>,
            @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRoleMapping> {
        return updateOauth2ProviderRoleRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DPath('id') id: string,
            @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRoleMapping> {
        return deleteOauth2ProvideRoleRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() user: NonNullable<IdentityProviderRoleMapping>,
            @DRequest() req: Request,
            @DResponse() res: Response,
    ): Promise<IdentityProviderRoleMapping> {
        return createOauth2ProviderRoleRouteHandler(req, res);
    }
}
