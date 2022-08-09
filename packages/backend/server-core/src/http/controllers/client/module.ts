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
import {
    Client,
} from '@authelion/common';
import {
    createClientRouteHandler,
    deleteClientRouteHandler,
    getManyClientRouteHandler,
    getOneClientRouteHandler,
    updateClientRouteHandler,
} from './handlers';
import { ForceLoggedInMiddleware } from '../../middleware';

@SwaggerTags('oauth2')
@Controller('/client')
export class ClientController {
    @Get('', [])
    async getClients(
        @Request() req: any,
            @Response() res: any,
    ): Promise<Client[]> {
        return getManyClientRouteHandler(req, res);
    }

    @Get('/:id', [])
    async getClient(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ): Promise<Client> {
        return getOneClientRouteHandler(req, res);
    }

    @Post('/:id', [ForceLoggedInMiddleware])
    async editClient(
        @Params('id') id: string,
            @Body() user: NonNullable<Client>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<Client> {
        return updateClientRouteHandler(req, res);
    }

    @Delete('/:id', [ForceLoggedInMiddleware])
    async dropClient(
        @Params('id') id: string,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<Client> {
        return deleteClientRouteHandler(req, res);
    }

    @Post('', [ForceLoggedInMiddleware])
    async addClient(
        @Body() user: NonNullable<Client>,
            @Request() req: any,
            @Response() res: any,
    ) : Promise<Client> {
        return createClientRouteHandler(req, res);
    }
}
