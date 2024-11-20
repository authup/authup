/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { RoleAttribute } from '@authup/core-kit';
import {
    createRoleAttributeRouteHandler,
    deleteRoleAttributeRouteHandler,
    getManyRoleAttributeRouteHandler,
    getOneRoleAttributeRouteHandler,
    updateRoleAttributeRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../../middleware';

@DTags('role')
@DController('/role-attributes')
export class RoleAttributeController {
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RoleAttribute[]> {
        return getManyRoleAttributeRouteHandler(req, res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<RoleAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<RoleAttribute> {
        return createRoleAttributeRouteHandler(req, res);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<RoleAttribute> {
        return getOneRoleAttributeRouteHandler(req, res);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() user: NonNullable<RoleAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<RoleAttribute> {
        return updateRoleAttributeRouteHandler(req, res);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ) : Promise<RoleAttribute> {
        return deleteRoleAttributeRouteHandler(req, res);
    }
}
