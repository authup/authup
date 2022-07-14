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
import { Role } from '@authelion/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createRoleRouteHandler, deleteRoleRouteHandler,
    getManyRoleRouteHandler,
    getOneRoleRouteHandler,
    updateRoleRouteHandler,
} from './handlers';

@SwaggerTags('role')
@Controller('/roles')
export class RoleController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<Role[]> {
        return getManyRoleRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() data: Pick<Role, 'name'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Role> {
        return createRoleRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Role> {
        return getOneRoleRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async edit(
        @Params('id') id: string,
            @Body() data: Pick<Role, 'name'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Role> {
        return updateRoleRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Role> {
        return deleteRoleRouteHandler(req, res);
    }
}
