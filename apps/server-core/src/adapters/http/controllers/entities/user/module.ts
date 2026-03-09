/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { User } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    deleteUserRouteHandler,
    getManyUserRouteHandler,
    getOneUserRouteHandler,
    writeUserRouteHandler,
} from './handlers/index.ts';

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
        return writeUserRouteHandler(req, res);
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
        return writeUserRouteHandler(req, res, {
            updateOnly: true,
        });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() user: User,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<User | undefined> {
        return writeUserRouteHandler(req, res);
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
