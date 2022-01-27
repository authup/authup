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
import { OAuth2Provider } from '@typescript-auth/domains';
import { Application } from 'express';
import {
    buildOAuth2ProviderAuthorizeCallbackPath,
    buildOAuth2ProviderAuthorizePath,
} from '@typescript-auth/domains/src/entities/oauth2-provider/utils';
import {
    authorizeCallbackOauth2ProviderRouteHandler,
    authorizeURLOauth2ProviderRouteHandler,
    createOauth2ProviderRouteHandler,
    deleteOauth2ProviderRouteHandler,
    getManyOauth2ProviderRouteHandler,
    getOneOauth2ProviderRouteHandler,
    updateOauth2ProviderRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';
import { ExpressNextFunction, ExpressRequest, ExpressResponse } from '../../type';
import { ControllerOptions } from '../type';

@SwaggerTags('auth')
@Controller('/oauth2-providers')
export class Oauth2ProviderController {
    @Get('', [])
    async getProviders(
        @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Provider[]> {
        return getManyOauth2ProviderRouteHandler(req, res);
    }

    @Get('/:id', [])
    async getProvider(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<OAuth2Provider> {
        return getOneOauth2ProviderRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @Params('id') id: string,
            @Body() user: NonNullable<OAuth2Provider>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<OAuth2Provider> {
        return updateOauth2ProviderRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<OAuth2Provider> {
        return deleteOauth2ProviderRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async addProvider(
        @Body() user: NonNullable<OAuth2Provider>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<OAuth2Provider> {
        return createOauth2ProviderRouteHandler(req, res);
    }
}

export function registerOauth2ProviderController(router: Application, options: ControllerOptions) {
    router.get(buildOAuth2ProviderAuthorizePath(':id'), async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        try {
            return await authorizeURLOauth2ProviderRouteHandler(req, res, options);
        } catch (e) {
            return next(e);
        }
    });

    router.get(buildOAuth2ProviderAuthorizeCallbackPath(':id'), async (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => {
        try {
            return await authorizeCallbackOauth2ProviderRouteHandler(req, res, options);
        } catch (e) {
            return next(e);
        }
    });
}
