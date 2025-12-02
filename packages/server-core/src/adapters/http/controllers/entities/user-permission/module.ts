/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { UserPermission } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    createUserPermissionRouteHandler,
    deleteUserPermissionRouteHandler,
    getManyUserPermissionRouteHandler,
    getOneUserPermissionRouteHandler,
} from './handlers';

@DTags('user')
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
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserPermission> {
        return getOneUserPermissionRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserPermission> {
        return deleteUserPermissionRouteHandler(req, res);
    }
}
