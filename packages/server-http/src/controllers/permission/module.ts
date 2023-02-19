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
import type { Permission } from '@authup/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createOnePermissionRouteHandler,
    deletePermissionRouteHandler,
    getManyPermissionRouteHandler,
    getOnePermissionRouteHandler,
    updatePermissionRouteHandler,
} from './handlers';

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

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DParam('id') id: string,
            @DBody() user: NonNullable<Permission>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Permission> {
        return updatePermissionRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Permission> {
        return deletePermissionRouteHandler(req, res);
    }
}
