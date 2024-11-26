/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PermissionAPICheckResponse } from '@authup/core-http-kit';
import { PolicyData } from '@authup/rules';
import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { Permission } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    checkPermissionRouteHandler,
    deletePermissionRouteHandler,
    getManyPermissionRouteHandler,
    getOnePermissionRouteHandler,
    writePermissionRouteHandler,
} from './handlers';

@DTags('permission')
@DController('/permissions')
export class PermissionController {
    @DGet('', [ForceLoggedInMiddleware])
    async getPermissions(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Permission[]> {
        return getManyPermissionRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<Permission>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Permission[]> {
        return writePermissionRouteHandler(req, res);
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DBody() data: NonNullable<PolicyData>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<PermissionAPICheckResponse> {
        return checkPermissionRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getPermission(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Permission> {
        return getOnePermissionRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() user: NonNullable<Permission>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Permission> {
        return writePermissionRouteHandler(req, res, {
            updateOnly: true,
        });
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() user: NonNullable<Permission>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Permission> {
        return writePermissionRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<Permission> {
        return deletePermissionRouteHandler(req, res);
    }
}
