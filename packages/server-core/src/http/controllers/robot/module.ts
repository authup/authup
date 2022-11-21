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
import { Robot } from '@authelion/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createRobotRouteHandler,
    deleteRobotRouteHandler,
    getManyRobotRouteHandler,
    getOneRobotRouteHandler,
    updateRobotRouteHandler,
} from './handlers';

@SwaggerTags('robot')
@DController('/robots')
export class RobotController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot[]> {
        return getManyRobotRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Robot,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot> {
        return createRobotRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot> {
        return getOneRobotRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DParam('id') id: string,
            @DBody() data: Pick<Robot, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot> {
        return updateRobotRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot> {
        return deleteRobotRouteHandler(req, res);
    }
}
