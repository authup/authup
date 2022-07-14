/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    Body, Controller, Delete, Get, Params, Post, Request, Response,
} from '@decorators/express';
import { SwaggerTags } from '@trapi/swagger';
import { RoleAttribute } from '@authelion/common';
import {
    createRoleAttributeRouteHandler,
    deleteRoleAttributeRouteHandler,
    getManyRoleAttributeRouteHandler,
    getOneRoleAttributeRouteHandler,
    updateRoleAttributeRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('role')
@Controller('/role-attributes')
export class RoleAttributeController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<RoleAttribute[]> {
        return getManyRoleAttributeRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() user: NonNullable<RoleAttribute>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<RoleAttribute> {
        return createRoleAttributeRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async get(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<RoleAttribute> {
        return getOneRoleAttributeRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async edit(
        @Params('id') id: string,
            @Body() user: NonNullable<RoleAttribute>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<RoleAttribute> {
        return updateRoleAttributeRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<RoleAttribute> {
        return deleteRoleAttributeRouteHandler(req, res);
    }
}
