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
import { RobotPermission } from '@typescript-auth/domains';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createRobotPermissionRouteHandler,
    deleteRobotPermissionRouteHandler,
    getManyRobotPermissionRouteHandler,
    getOneRobotPermissionRouteHandler,
} from './handlers';

@SwaggerTags('robot')
@Controller('/robot-permissions')
export class RobotPermissionController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<RobotPermission[]> {
        return getManyRobotPermissionRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() data: Pick<RobotPermission, 'robot_id' | 'permission_id'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RobotPermission> {
        return createRobotPermissionRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RobotPermission> {
        return getOneRobotPermissionRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RobotPermission> {
        return deleteRobotPermissionRouteHandler(req, res);
    }
}
