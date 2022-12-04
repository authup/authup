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
import { RobotRole } from '@authup/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createRobotRoleRouteHandler,
    deleteRobotRoleRouteHandler,
    getManyRobotRoleRouteHandler,
    getOneRobotRoleRouteHandler,
} from './handlers';

@SwaggerTags('robot')
@DController('/robot-roles')
export class RobotRoleController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotRole[]> {
        return getManyRobotRoleRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<RobotRole, 'role_id' | 'robot_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotRole> {
        return await createRobotRoleRouteHandler(req, res) as RobotRole;
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotRole> {
        return await getOneRobotRoleRouteHandler(req, res) as RobotRole;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotRole> {
        return await deleteRobotRoleRouteHandler(req, res) as RobotRole;
    }
}
