/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { RolePermission } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    createRolePermissionRouteHandler,
    deleteRolePermissionRouteHandler,
    getManyRolePermissionRouteHandler,
    getOneRolePermissionRouteHandler,
} from './handlers/index.ts';

@DTags('role')
@DController('/role-permissions')
export class RolePermissionController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RolePermission[]> {
        return getManyRolePermissionRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<RolePermission, 'role_id' | 'permission_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RolePermission> {
        return createRolePermissionRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RolePermission> {
        return getOneRolePermissionRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RolePermission> {
        return deleteRolePermissionRouteHandler(req, res);
    }
}
