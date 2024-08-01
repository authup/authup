/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { Robot } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    deleteRobotRouteHandler,
    getManyRobotRouteHandler,
    getOneRobotRouteHandler,
    handleRobotIntegrityRouteHandler,
    writeRobotRouteHandler,
} from './handlers';

@DTags('robot')
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
        return writeRobotRouteHandler(req, res);
    }

    @DGet('/:id/integrity', [])
    async command(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot> {
        return handleRobotIntegrityRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot> {
        return getOneRobotRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() data: Pick<Robot, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot> {
        return writeRobotRouteHandler(req, res, {
            updateOnly: true,
        });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() data: Pick<Robot, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot> {
        return writeRobotRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Robot> {
        return deleteRobotRouteHandler(req, res);
    }
}
