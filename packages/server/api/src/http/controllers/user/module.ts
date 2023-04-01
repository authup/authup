/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { User } from '@authup/core';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createUserRouteHandler,
    deleteUserRouteHandler,
    getManyUserRouteHandler,
    getOneUserRouteHandler,
    updateUserRouteHandler,
} from './handlers';

@DTags('user')
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
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<User | undefined> {
        return getOneUserRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() user: User,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<User | undefined> {
        return updateUserRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<User | undefined> {
        return deleteUserRouteHandler(req, res);
    }
}
