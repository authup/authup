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
import { Client } from '@typescript-auth/domains';
import { ForceLoggedInMiddleware } from '../../middleware';
import {
    createClientRouteHandler,
    deleteClientRouteHandler,
    getManyClientRouteHandler,
    getOneClientRouteHandler,
    updateClientRouteHandler,
} from './handlers';

@SwaggerTags('auth')
@Controller('/clients')
export class ClientController {
    @Get('', [ForceLoggedInMiddleware])
    async getMany(
        @Request() req: any,
            @Response() res: any,
    ): Promise<Client[]> {
        return getManyClientRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async add(
        @Body() data: Client,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Client> {
        return createClientRouteHandler(req, res);
    }

    @Get('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Client> {
        return getOneClientRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async edit(
        @Params('id') id: string,
            @Body() data: Pick<Client, 'name'>,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Client> {
        return updateClientRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Client> {
        return deleteClientRouteHandler(req, res);
    }
}
