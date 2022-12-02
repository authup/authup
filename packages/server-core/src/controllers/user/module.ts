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
import { User } from '@authelion/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createUserRouteHandler,
    deleteUserRouteHandler,
    getManyUserRouteHandler,
    getOneUserRouteHandler,
    updateUserRouteHandler,
} from './handlers';

@SwaggerTags('user')
@DController('/users')
export class UserController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<User[]> {
        return getManyUserRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<User>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<User | undefined> {
        return createUserRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<User | undefined> {
        return getOneUserRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DParam('id') id: string,
            @DBody() user: User,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<User | undefined> {
        return updateUserRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<User | undefined> {
        return deleteUserRouteHandler(req, res);
    }
}
