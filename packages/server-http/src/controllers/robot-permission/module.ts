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
import type { RobotPermission } from '@authup/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createRobotPermissionRouteHandler,
    deleteRobotPermissionRouteHandler,
    getManyRobotPermissionRouteHandler,
    getOneRobotPermissionRouteHandler,
} from './handlers';

@SwaggerTags('robot')
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
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotPermission> {
        return getOneRobotPermissionRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RobotPermission> {
        return deleteRobotPermissionRouteHandler(req, res);
    }
}
