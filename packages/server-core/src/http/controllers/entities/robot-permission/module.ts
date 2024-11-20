/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { RobotPermission } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    createRobotPermissionRouteHandler,
    deleteRobotPermissionRouteHandler,
    getManyRobotPermissionRouteHandler,
    getOneRobotPermissionRouteHandler,
} from './handlers';

@DTags('robot')
@DController('/robot-permissions')
export class RobotPermissionController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotPermission[]> {
        return getManyRobotPermissionRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<RobotPermission, 'robot_id' | 'permission_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotPermission> {
        return createRobotPermissionRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotPermission> {
        return getOneRobotPermissionRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotPermission> {
        return deleteRobotPermissionRouteHandler(req, res);
    }
}
