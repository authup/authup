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
import { RobotRole } from '@typescript-auth/domains';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createRobotRoleRouteHandler,
    deleteRobotRoleRouteHandler,
    getManyRobotRoleRouteHandler,
    getOneRobotRoleRouteHandler,
} from './handlers';

@SwaggerTags('robot')
@Controller('/robot-roles')
export class RobotRoleController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<RobotRole[]> {
        return getManyRobotRoleRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() data: Pick<RobotRole, 'role_id' | 'robot_id'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RobotRole> {
        return await createRobotRoleRouteHandler(req, res) as RobotRole;
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RobotRole> {
        return await getOneRobotRoleRouteHandler(req, res) as RobotRole;
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RobotRole> {
        return await deleteRobotRoleRouteHandler(req, res) as RobotRole;
    }
}
