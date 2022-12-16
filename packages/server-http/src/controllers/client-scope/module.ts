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
import { ClientScope } from '@authup/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createClientScopeRouteHandler,
    deleteClientScopeRouteHandler,
    getManyClientScopeRouteHandler,
    getOneClientScopeRouteHandler,
} from './handlers';

@SwaggerTags('client', 'scope')
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
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientScope> {
        return await getOneClientScopeRouteHandler(req, res) as ClientScope;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DParam('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<ClientScope> {
        return await deleteClientScopeRouteHandler(req, res) as ClientScope;
    }
}
