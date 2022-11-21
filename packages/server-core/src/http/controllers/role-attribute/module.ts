/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DParam, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { SwaggerTags } from '@trapi/swagger';
import { RoleAttribute } from '@authelion/common';
import {
    createRoleAttributeRouteHandler,
    deleteRoleAttributeRouteHandler,
    getManyRoleAttributeRouteHandler,
    getOneRoleAttributeRouteHandler,
    updateRoleAttributeRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('role')
@DController('/role-attributes')
export class RoleAttributeController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RoleAttribute[]> {
        return getManyRoleAttributeRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<RoleAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<RoleAttribute> {
        return createRoleAttributeRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RoleAttribute> {
        return getOneRoleAttributeRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DParam('id') id: string,
            @DBody() user: NonNullable<RoleAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<RoleAttribute> {
        return updateRoleAttributeRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<RoleAttribute> {
        return deleteRoleAttributeRouteHandler(req, res);
    }
}
