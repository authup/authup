/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyAPICheckResponse } from '@authup/core-http-kit';
import { Policy } from '@authup/core-kit';
import { PolicyInput } from '@authup/access';
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
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Policy[]> {
        return getManyPolicyRouteHandler(req, res);
    }

    @DGet('/:id/expanded', [])
    async getOneExpanded(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Policy> {
        return getOnePolicyRouteHandler(req, res, {
            expanded: true,
        });
    }

    @DGet('/:id', [])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Policy> {
        return getOnePolicyRouteHandler(req, res);
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DPath('id') id: string,
            @DBody() data: PolicyInput,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<PolicyAPICheckResponse> {
        return checkPolicyRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async update(
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
    async replace(
        @DPath('id') id: string,
            @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Policy> {
        return writePolicyRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Policy> {
        return deletePolicyRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async create(
        @DBody() data: NonNullable<Policy>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Policy> {
        return writePolicyRouteHandler(req, res);
    }
}
