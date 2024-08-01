/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { coreHandler } from 'routup';
import type {
    Router,
} from 'routup';
import type { IdentityProvider } from '@authup/core-kit';
import {
    buildIdentityProviderAuthorizeCallbackPath,
    buildIdentityProviderAuthorizePath,
} from '@authup/core-kit';
import {
    authorizeCallbackIdentityProviderRouteHandler,
    authorizeURLIdentityProviderRouteHandler,
    deleteIdentityProviderRouteHandler,
    getManyIdentityProviderRouteHandler,
    getOneIdentityProviderRouteHandler,
    writeIdentityProviderRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@DTags('identity')
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
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<IdentityProvider> {
        return getOneIdentityProviderRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DPath('id') id: string,
            @DBody() user: NonNullable<IdentityProvider>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return writeIdentityProviderRouteHandler(req, res, {
            updateOnly: true,
        });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() user: NonNullable<IdentityProvider>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return writeIdentityProviderRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DPath('id') id: string,
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
        return writeIdentityProviderRouteHandler(req, res);
    }
}

export function registerIdentityProviderController(router: Router) {
    router.get(
        buildIdentityProviderAuthorizePath(':id'),
        coreHandler((async (req, res, next) => {
            try {
                await authorizeURLIdentityProviderRouteHandler(req, res);
            } catch (e) {
                next(e);
            }
        })),
    );

    router.get(
        buildIdentityProviderAuthorizeCallbackPath(':id'),
        coreHandler(async (req, res, next) => {
            try {
                await authorizeCallbackIdentityProviderRouteHandler(req, res);
            } catch (e) {
                next(e);
            }
        }),
    );
}
