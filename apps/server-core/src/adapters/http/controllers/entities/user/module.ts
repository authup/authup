/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DPut, DRequest, DResponse, DTags,
} from '@routup/decorators';
import type { User } from '@authup/core-kit';
import {
    send, sendAccepted, sendCreated, useRequestParam,
} from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { useRequestBody } from '@routup/basic/body';
import type { IUserService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { isSelfToken } from '../../../../../utils/index.ts';
import {
    buildActorContext,
    getRequestParamID,
    useRequestParamID,
} from '../../../request/index.ts';

export type UserControllerContext = {
    service: IUserService,
};

@DTags('user')
@DController('/users')
export class UserController {
    protected service: IUserService;

    constructor(ctx: UserControllerContext) {
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

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        let paramId = useRequestParamID(req, { isUUID: false });

        if (
            isSelfToken(paramId) &&
            actor.identity &&
            actor.identity.type === 'user'
        ) {
            paramId = actor.identity.data.id;
        }

        const entity = await this.service.getOne(
            paramId,
            actor,
            useRequestQuery(req),
            useRequestParam(req, 'realmId'),
        );

        return send(res, entity);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: NonNullable<User>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.create(useRequestBody(req), actor);

        return sendCreated(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() data: NonNullable<User>,
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
            @DBody() data: NonNullable<User>,
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
