/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody,
    DController,
    DDelete,
    DGet,
    DPath,
    DPost,
    DRequest,
    DResponse,
    DTags,
} from '@routup/decorators';
import type { Request, Response } from 'routup';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    IIdentityProviderRoleMappingService,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
} from '../../../request/index.ts';

export type IdentityProviderRoleMappingControllerContext = {
    service: IIdentityProviderRoleMappingService,
};

@DTags('identity-provider')
@DController('/identity-provider-role-mappings')
export class IdentityProviderRoleMappingController {
    protected service: IIdentityProviderRoleMappingService;

    constructor(ctx: IdentityProviderRoleMappingControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(req), actor);

        return send(res, {
            data,
            meta,
        });
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.getOne(id, actor);

        return send(res, entity);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: any,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.create(data, actor);

        return sendCreated(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: any,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.update(id, data, actor);

        return sendAccepted(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.delete(id, actor);

        return sendAccepted(res, entity);
    }
}
