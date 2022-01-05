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
import { UserRole } from '@typescript-auth/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createUserRoleRouteHandler,
    deleteUserRoleRouteHandler,
    getManyUserRoleRouteHandler,
    getOneUserRoleRouteHandler,
} from './handlers';

@SwaggerTags('user')
@Controller('/user-roles')
export class UserRoleController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<UserRole[]> {
        return getManyUserRoleRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() data: Pick<UserRole, 'role_id' | 'user_id'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<UserRole> {
        return await createUserRoleRouteHandler(req, res) as UserRole;
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<UserRole> {
        return await getOneUserRoleRouteHandler(req, res) as UserRole;
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<UserRole> {
        return await deleteUserRoleRouteHandler(req, res) as UserRole;
    }
}
