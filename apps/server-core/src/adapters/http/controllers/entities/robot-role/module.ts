/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { RobotRole } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    createRobotRoleRouteHandler,
    deleteRobotRoleRouteHandler,
    getManyRobotRoleRouteHandler,
    getOneRobotRoleRouteHandler,
} from './handlers/index.ts';

@DTags('robot')
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
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotRole> {
        return await getOneRobotRoleRouteHandler(req, res) as RobotRole;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotRole> {
        return await deleteRobotRoleRouteHandler(req, res) as RobotRole;
    }
}
