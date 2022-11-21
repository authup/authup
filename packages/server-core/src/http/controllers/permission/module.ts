/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DGet, DParam, DPost, DRequest, DResponse,
} from '@routup/decorators';
import { SwaggerTags } from '@trapi/swagger';
import { Permission } from '@authelion/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import { createOnePermissionRouteHandler, getManyPermissionRouteHandler, getOnePermissionRouteHandler } from './handlers';

@SwaggerTags('permission')
@DController('/permissions')
export class PermissionController {
    @DGet('', [ForceLoggedInMiddleware])
    async getPermissions(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Permission[]> {
        return getManyPermissionRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getPermission(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Permission> {
        return getOnePermissionRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<Permission>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Permission[]> {
        return createOnePermissionRouteHandler(req, res);
    }
}
