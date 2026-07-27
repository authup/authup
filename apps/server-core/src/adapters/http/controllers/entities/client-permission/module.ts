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
    EntityRecordWrappedResponse,
} from '@authup/core-http-kit';
import type { ClientPermission } from '@authup/core-kit';
import type { IClientPermissionService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    clientPermissionSchema,
    describeQuerySchema,
} from '../../../../../core/index.ts';
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
            meta: {
                ...meta,
                schema: describeQuerySchema(clientPermissionSchema),
            },
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: ClientPermissionCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<ClientPermission>> {
        const actor = buildActorContext(event);

        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: ClientPermissionUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<ClientPermission>> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(id, data, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<ClientPermission>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return { data: entity, meta: { schema: describeQuerySchema(clientPermissionSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<ClientPermission>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(
            id,
            actor,
        );

        event.response.status = 202;

        return { data: entity, meta: {} };
    }
}
