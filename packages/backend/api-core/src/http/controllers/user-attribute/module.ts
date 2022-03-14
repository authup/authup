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
import { UserAttribute } from '@authelion/common';
import {
    createUserAttributeRouteHandler, deleteUserAttributeRouteHandler,
    getManyUserAttributeRouteHandler,
    getOneUserAttributeRouteHandler,
    updateUserAttributeRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('user')
@Controller('/user-attributes')
export class UserAttributeController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<UserAttribute[]> {
        return getManyUserAttributeRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() user: NonNullable<UserAttribute>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<UserAttribute> {
        return createUserAttributeRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async get(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<UserAttribute> {
        return getOneUserAttributeRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async edit(
        @Params('id') id: string,
            @Body() user: NonNullable<UserAttribute>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<UserAttribute> {
        return updateUserAttributeRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<UserAttribute> {
        return deleteUserAttributeRouteHandler(req, res);
    }
}
