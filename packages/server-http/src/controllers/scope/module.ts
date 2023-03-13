/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { Scope } from '@authup/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createScopeRouteHandler,
    deleteScopeRouteHandler,
    getManyScopeRouteHandler,
    getOneScopeRouteHandler,
    updateScopeRouteHandler,
} from './handlers';

@DTags('scope')
@DController('/scopes')
export class ScopeController {
    @DGet('', [])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Scope[]> {
        return getManyScopeRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<Scope, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Scope> {
        return createScopeRouteHandler(req, res);
    }

    @DGet('/:id', [])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Scope> {
        return getOneScopeRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() data: Pick<Scope, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Scope> {
        return updateScopeRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<Scope> {
        return deleteScopeRouteHandler(req, res);
    }
}
