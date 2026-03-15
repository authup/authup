/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { Role } from '@authup/core-kit';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { useRequestBody } from '@routup/basic/body';
import type { IRoleService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
    getRequestParamID,
    useRequestParamID,
} from '../../../request/index.ts';

export type RoleControllerContext = {
    service: IRoleService,
};

@DTags('role')
@DController('/roles')
export class RoleController {
    protected service: IRoleService;

    constructor(ctx: RoleControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const { data, meta } = await this.service.getMany(useRequestQuery(req), actor);

        return send(res, { data, meta });
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<Role, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.create(useRequestBody(req), actor);

        return sendCreated(res, entity);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.getOne(
            useRequestParamID(req, { isUUID: false }),
            actor,
        );

        return send(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() data: Pick<Role, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.update(
            useRequestParamID(req, { isUUID: false }),
            useRequestBody(req),
            actor,
        );

        return sendAccepted(res, entity);
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
            @DBody() data: Pick<Role, 'name'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const paramId = getRequestParamID(req, { isUUID: false });
        const { entity, created } = await this.service.save(
            paramId || undefined,
            useRequestBody(req),
            actor,
        );

        if (created) {
            return sendCreated(res, entity);
        }

        return sendAccepted(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.delete(useRequestParamID(req), actor);

        return sendAccepted(res, entity);
    }
}
