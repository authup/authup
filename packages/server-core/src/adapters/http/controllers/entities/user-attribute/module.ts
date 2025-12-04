/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { UserAttribute } from '@authup/core-kit';
import {
    createUserAttributeRouteHandler, deleteUserAttributeRouteHandler,
    getManyUserAttributeRouteHandler,
    getOneUserAttributeRouteHandler,
    updateUserAttributeRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../../middleware';

@DTags('user')
@DController('/user-attributes')
export class UserAttributeController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserAttribute[]> {
        return getManyUserAttributeRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<UserAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<UserAttribute> {
        return createUserAttributeRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserAttribute> {
        return getOneUserAttributeRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() user: NonNullable<UserAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<UserAttribute> {
        return updateUserAttributeRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<UserAttribute> {
        return deleteUserAttributeRouteHandler(req, res);
    }
}
