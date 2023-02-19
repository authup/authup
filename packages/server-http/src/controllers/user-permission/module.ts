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
import type { UserPermission } from '@authup/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createUserPermissionRouteHandler,
    deleteUserPermissionRouteHandler,
    getManyUserPermissionRouteHandler,
    getOneUserPermissionRouteHandler,
} from './handlers';

@SwaggerTags('user')
@DController('/user-permissions')
export class UserPermissionController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserPermission[]> {
        return getManyUserPermissionRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<UserPermission, 'user_id' | 'permission_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserPermission> {
        return createUserPermissionRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserPermission> {
        return getOneUserPermissionRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserPermission> {
        return deleteUserPermissionRouteHandler(req, res);
    }
}
