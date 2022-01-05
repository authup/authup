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
import { RolePermission } from '@typescript-auth/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createRolePermissionRouteHandler,
    deleteRolePermissionRouteHandler,
    getManyRolePermissionRouteHandler,
    getOneRolePermissionRouteHandler,
} from './handlers';

@SwaggerTags('auth')
@Controller('/role-permissions')
export class RolePermissionController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<RolePermission[]> {
        return getManyRolePermissionRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() data: Pick<RolePermission, 'role_id' | 'permission_id'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RolePermission> {
        return createRolePermissionRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RolePermission> {
        return getOneRolePermissionRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RolePermission> {
        return deleteRolePermissionRouteHandler(req, res);
    }
}
