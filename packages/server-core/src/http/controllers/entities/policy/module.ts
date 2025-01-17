/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyAPICheckResponse } from '@authup/core-http-kit';
import { Policy } from '@authup/core-kit';
import { PolicyData } from '@authup/access';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import {
    deletePolicyRouteHandler,
    getManyPolicyRouteHandler,
    getOnePolicyRouteHandler,
    writePolicyRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../../middleware';
import { checkPolicyRouteHandler } from './handlers/check';

@DTags('policy')
@DController('/policies')
export class PolicyController {
    @DGet('', [])
    async getProviders(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Policy[]> {
        return getManyPolicyRouteHandler(req, res);
    }

    @DGet('/:id', [])
    async getProvider(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Policy> {
        return getOnePolicyRouteHandler(req, res);
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DPath('id') id: string,
            @DBody() data: PolicyData,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<PolicyAPICheckResponse> {
        return checkPolicyRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DPath('id') id: string,
            @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Policy> {
        return writePolicyRouteHandler(req, res, {
            updateOnly: true,
        });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Policy> {
        return writePolicyRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Policy> {
        return deletePolicyRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Policy> {
        return writePolicyRouteHandler(req, res);
    }
}
