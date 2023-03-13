/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { Role } from '@authup/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createRoleRouteHandler, deleteRoleRouteHandler,
    getManyRoleRouteHandler,
    getOneRoleRouteHandler,
    updateRoleRouteHandler,
} from './handlers';

@DTags('role')
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
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Role> {
        return getOneRoleRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() data: Pick<Role, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Role> {
        return updateRoleRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Role> {
        return deleteRoleRouteHandler(req, res);
    }
}
