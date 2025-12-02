/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { ClientScope } from '@authup/core-kit';
import { ForceLoggedInMiddleware } from '../../../middleware';
import {
    createClientScopeRouteHandler,
    deleteClientScopeRouteHandler,
    getManyClientScopeRouteHandler,
    getOneClientScopeRouteHandler,
} from './handlers';

@DTags('client', 'scope')
@DController('/client-scopes')
export class ClientScopeController {
    @DGet('', [])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientScope[]> {
        return getManyClientScopeRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<ClientScope, 'client_id' | 'scope_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientScope> {
        return await createClientScopeRouteHandler(req, res) as ClientScope;
    }

    @DGet('/:id', [])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientScope> {
        return await getOneClientScopeRouteHandler(req, res) as ClientScope;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientScope> {
        return await deleteClientScopeRouteHandler(req, res) as ClientScope;
    }
}
