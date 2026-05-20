/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody,
    DContext,
    DController,
    DDelete,
    DGet,
    DPath,
    DPost,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    ClientPermissionCreatePayload,
    ClientPermissionUpdatePayload,
    EntityCollectionResponse,
} from '@authup/core-http-kit';
import type { ClientPermission } from '@authup/core-kit';
import type { IClientPermissionService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type ClientPermissionControllerContext = {
    service: IClientPermissionService,
};

@DTags('client')
@DController('/client-permissions')
export class ClientPermissionController {
    protected service: IClientPermissionService;

    constructor(ctx: ClientPermissionControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<ClientPermission>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta,
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: ClientPermissionCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<ClientPermission> {
        const actor = buildActorContext(event);

        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return entity;
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: ClientPermissionUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<ClientPermission> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(id, data, actor);

        event.response.status = 202;

        return entity;
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<ClientPermission> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return entity;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<ClientPermission> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(
            id,
            actor,
        );

        event.response.status = 202;

        return entity;
    }
}
