/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { ClientRole } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    createClientRoleRouteHandler,
    deleteClientRoleRouteHandler,
    getManyClientRoleRouteHandler,
    getOneClientRoleRouteHandler,
} from './handlers';

@DTags('client')
@DController('/client-roles')
export class ClientRoleController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientRole[]> {
        return getManyClientRoleRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<ClientRole, 'role_id' | 'client_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientRole> {
        return await createClientRoleRouteHandler(req, res) as ClientRole;
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientRole> {
        return await getOneClientRoleRouteHandler(req, res) as ClientRole;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientRole> {
        return await deleteClientRoleRouteHandler(req, res) as ClientRole;
    }
}
