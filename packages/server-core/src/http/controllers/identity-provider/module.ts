/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DParam, DPost, DRequest, DResponse,
} from '@routup/decorators';
import {
    Next, Request, Response, Router,
} from 'routup';
import { SwaggerTags } from '@trapi/swagger';
import {
    IdentityProvider,
    buildIdentityProviderAuthorizeCallbackPath,
    buildIdentityProviderAuthorizePath,
} from '@authelion/common';
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

@SwaggerTags('identity')
@DController('/identity-providers')
export class IdentityProviderController {
    @DGet('', [])
    async getProviders(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<IdentityProvider[]> {
        return getManyIdentityProviderRouteHandler(req, res);
    }

    @DGet('/:id', [])
    async getProvider(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<IdentityProvider> {
        return getOneIdentityProviderRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DParam('id') id: string,
            @DBody() user: NonNullable<IdentityProvider>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return updateIdentityProviderRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return deleteIdentityProviderRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() user: NonNullable<IdentityProvider>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return createIdentityProviderRouteHandler(req, res);
    }
}

export function registerIdentityProviderController(router: Router) {
    router.get(buildIdentityProviderAuthorizePath(':id'), async (req: Request, res: Response, next: Next) => {
        try {
            await authorizeURLIdentityProviderRouteHandler(req, res);
        } catch (e) {
            next(e);
        }
    });

    router.get(buildIdentityProviderAuthorizeCallbackPath(':id'), async (req: Request, res: Response, next: Next) => {
        try {
            await authorizeCallbackIdentityProviderRouteHandler(req, res);
        } catch (e) {
            next(e);
        }
    });
}
