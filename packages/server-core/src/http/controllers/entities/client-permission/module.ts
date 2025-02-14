/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { ClientPermission } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    createClientPermissionRouteHandler,
    deleteClientPermissionRouteHandler,
    getManyClientPermissionRouteHandler,
    getOneClientPermissionRouteHandler,
} from './handlers';

@DTags('client')
@DController('/client-permissions')
export class ClientPermissionController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientPermission[]> {
        return getManyClientPermissionRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<ClientPermission, 'client_id' | 'permission_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientPermission> {
        return createClientPermissionRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientPermission> {
        return getOneClientPermissionRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientPermission> {
        return deleteClientPermissionRouteHandler(req, res);
    }
}
