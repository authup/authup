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
import { UserAttribute } from '@authelion/common';
import {
    createUserAttributeRouteHandler, deleteUserAttributeRouteHandler,
    getManyUserAttributeRouteHandler,
    getOneUserAttributeRouteHandler,
    updateUserAttributeRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('user')
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
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserAttribute> {
        return getOneUserAttributeRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DParam('id') id: string,
            @DBody() user: NonNullable<UserAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<UserAttribute> {
        return updateUserAttributeRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<UserAttribute> {
        return deleteUserAttributeRouteHandler(req, res);
    }
}
