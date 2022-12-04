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
import { Role } from '@authup/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createRoleRouteHandler, deleteRoleRouteHandler,
    getManyRoleRouteHandler,
    getOneRoleRouteHandler,
    updateRoleRouteHandler,
} from './handlers';

@SwaggerTags('role')
@DController('/roles')
export class RoleController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Role[]> {
        return getManyRoleRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<Role, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Role> {
        return createRoleRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Role> {
        return getOneRoleRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DParam('id') id: string,
            @DBody() data: Pick<Role, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Role> {
        return updateRoleRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Role> {
        return deleteRoleRouteHandler(req, res);
    }
}
