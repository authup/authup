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
    ClientRoleCreatePayload,
    EntityCollectionResponse,
    EntityRecordResponse,
} from '@authup/core-http-kit';
import type { ClientRole } from '@authup/core-kit';
import type { IClientRoleService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    clientRoleSchema,
    describeQuerySchema,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
} from '../../../request/index.ts';

export type ClientRoleControllerContext = {
    service: IClientRoleService,
};

@DTags('client')
@DController('/client-roles')
export class ClientRoleController {
    protected service: IClientRoleService;

    constructor(ctx: ClientRoleControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<ClientRole>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(clientRoleSchema),
            },
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: ClientRoleCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientRole>> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientRole>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return { data: entity, meta: { schema: describeQuerySchema(clientRoleSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientRole>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }
}
