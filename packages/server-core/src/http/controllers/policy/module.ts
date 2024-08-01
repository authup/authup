/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { IdentityProvider } from '@authup/core-kit';
import {
    deletePolicyRouteHandler,
    getManyPolicyRouteHandler,
    getOnePolicyRouteHandler,
    writePolicyRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@DTags('policy')
@DController('/policies')
export class PolicyController {
    @DGet('', [])
    async getProviders(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<IdentityProvider[]> {
        return getManyPolicyRouteHandler(req, res);
    }

    @DGet('/:id', [])
    async getProvider(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<IdentityProvider> {
        return getOnePolicyRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DPath('id') id: string,
            @DBody() user: NonNullable<IdentityProvider>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return writePolicyRouteHandler(req, res, {
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
        return writePolicyRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return deletePolicyRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() user: NonNullable<IdentityProvider>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<IdentityProvider> {
        return writePolicyRouteHandler(req, res);
    }
}
