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
    OAuth2IdentityProvider,
    buildIdentityProviderAuthorizeCallbackPath,
    buildIdentityProviderAuthorizePath,
} from '@authelion/common';
import { Application } from 'express';
import {
    authorizeCallbackIdentityProviderRouteHandler,
    authorizeURLIdentityProviderRouteHandler,
    createIdentityProviderRouteHandler,
    deleteIdentityProviderRouteHandler,
    getManyIdentityProviderRouteHandler,
    getOneIdentityProviderRouteHandler,
    updateIdentityProviderRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../../type';

@SwaggerTags('identity')
@Controller('/identity-providers')
export class IdentityProviderController {
    @Get('', [])
    async getProviders(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2IdentityProvider[]> {
        return getManyIdentityProviderRouteHandler(req, res);
    }

    @Get('/:id', [])
    async getProvider(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2IdentityProvider> {
        return getOneIdentityProviderRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @Params('id') id: string,
            @Body() user: NonNullable<OAuth2IdentityProvider>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<OAuth2IdentityProvider> {
        return updateIdentityProviderRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<OAuth2IdentityProvider> {
        return deleteIdentityProviderRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async addProvider(
        @Body() user: NonNullable<OAuth2IdentityProvider>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<OAuth2IdentityProvider> {
        return createIdentityProviderRouteHandler(req, res);
    }
}

export function registerIdentityProviderController(router: Application) {
    router.get(buildIdentityProviderAuthorizePath(':id'), async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        try {
            await authorizeURLIdentityProviderRouteHandler(req, res);
        } catch (e) {
            next(e);
        }
    });

    router.get(buildIdentityProviderAuthorizeCallbackPath(':id'), async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        try {
            await authorizeCallbackIdentityProviderRouteHandler(req, res);
        } catch (e) {
            next(e);
        }
    });
}
