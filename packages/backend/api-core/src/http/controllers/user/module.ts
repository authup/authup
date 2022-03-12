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
import { User } from '@authelion/common';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createUserRouteHandler,
    deleteUserRouteHandler,
    getManyUserRouteHandler,
    getOneUserRouteHandler,
    updateUserRouteHandler,
} from './handlers';

@SwaggerTags('user')
@Controller('/users')
export class UserController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<User[]> {
        return getManyUserRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() user: NonNullable<User>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<User | undefined> {
        return createUserRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async get(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<User | undefined> {
        return getOneUserRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async edit(
        @Params('id') id: string,
            @Body() user: User,
            @Request() req: any,
            @Response() res: any,
    ): Promise<User | undefined> {
        return updateUserRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<User | undefined> {
        return deleteUserRouteHandler(req, res);
    }
}
