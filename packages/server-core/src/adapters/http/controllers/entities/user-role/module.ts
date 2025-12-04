/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { UserRole } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    createUserRoleRouteHandler,
    deleteUserRoleRouteHandler,
    getManyUserRoleRouteHandler,
    getOneUserRoleRouteHandler,
} from './handlers';

@DTags('user')
@DController('/user-roles')
export class UserRoleController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserRole[]> {
        return getManyUserRoleRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<UserRole, 'role_id' | 'user_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserRole> {
        return await createUserRoleRouteHandler(req, res) as UserRole;
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserRole> {
        return await getOneUserRoleRouteHandler(req, res) as UserRole;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<UserRole> {
        return await deleteUserRoleRouteHandler(req, res) as UserRole;
    }
}
