/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Body, Controller, Get, Params, Post, Request, Response,
} from '@decorators/express';
import { SwaggerTags } from '@trapi/swagger';
import { Permission } from '@typescript-auth/domains';
import { ForceLoggedInMiddleware } from '../../middleware';
import { createOnePermissionRouteHandler, getManyPermissionRouteHandler, getOnePermissionRouteHandler } from './handlers';

@SwaggerTags('auth')
@Controller('/permissions')
export class PermissionController {
    @Get('', [ForceLoggedInMiddleware])
    async getPermissions(
        @Request() req: any,
            @Response() res: any,
    ): Promise<Permission[]> {
        return getManyPermissionRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async getPermission(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Permission> {
        return getOnePermissionRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() user: NonNullable<Permission>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Permission[]> {
        return createOnePermissionRouteHandler(req, res);
    }
}
