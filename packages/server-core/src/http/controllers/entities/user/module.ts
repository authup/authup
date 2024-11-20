/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { User } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    createAuthActivateRouteHandler,
    createAuthPasswordForgotRouteHandler,
    createAuthPasswordResetRouteHandler,
    createAuthRegisterRouteHandler,
    deleteUserRouteHandler,
    getManyUserRouteHandler,
    getOneUserRouteHandler,
    writeUserRouteHandler,
} from './handlers';

@DTags('user')
@DController('/users')
export class UserController {
    @DPost('/activate', [])
    async activate(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return createAuthActivateRouteHandler(req, res);
    }

    @DPost('/register', [])
    async register(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return createAuthRegisterRouteHandler(req, res);
    }

    @DPost('/password-forgot', [])
    async forgotPassword(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return createAuthPasswordForgotRouteHandler(req, res);
    }

    @DPost('/password-reset', [])
    async resetPassword(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<void> {
        return createAuthPasswordResetRouteHandler(req, res);
    }

    // -----------------------------------------------------

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
