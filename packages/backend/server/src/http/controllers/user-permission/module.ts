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
import { UserPermission } from '@typescript-auth/domains';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createUserPermissionRouteHandler,
    deleteUserPermissionRouteHandler,
    getManyUserPermissionRouteHandler,
    getOneUserPermissionRouteHandler,
} from './handlers';

@SwaggerTags('user')
@Controller('/user-permissions')
export class UserPermissionController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<UserPermission[]> {
        return getManyUserPermissionRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() data: Pick<UserPermission, 'user_id' | 'permission_id'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<UserPermission> {
        return createUserPermissionRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<UserPermission> {
        return getOneUserPermissionRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<UserPermission> {
        return deleteUserPermissionRouteHandler(req, res);
    }
}
