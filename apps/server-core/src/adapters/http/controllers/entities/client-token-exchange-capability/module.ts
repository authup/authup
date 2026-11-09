/*
 * Copyright (c) 2026.
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
    ClientTokenExchangeCapabilityCreatePayload,
    ClientTokenExchangeCapabilityUpdatePayload,
    EntityCollectionResponse,
    EntityRecordResponse,
} from '@authup/core-http-kit';
import type { ClientTokenExchangeCapability } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { IClientTokenExchangeCapabilityService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    clientTokenExchangeCapabilitySchema,
    describeQuerySchema,
} from '../../../../../core/index.ts';
import { DQuerySchema } from '../../../decorators/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type ClientTokenExchangeCapabilityControllerContext = {
    service: IClientTokenExchangeCapabilityService,
};

@DTags('client')
@DController('/client-token-exchange-capabilities')
export class ClientTokenExchangeCapabilityController {
    protected service: IClientTokenExchangeCapabilityService;

    constructor(ctx: ClientTokenExchangeCapabilityControllerContext) {
        this.service = ctx.service;
    }

    @DQuerySchema(EntityType.CLIENT_TOKEN_EXCHANGE_CAPABILITY, 'collection')
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<ClientTokenExchangeCapability>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(clientTokenExchangeCapabilitySchema),
            },
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: ClientTokenExchangeCapabilityCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    @DQuerySchema(EntityType.CLIENT_TOKEN_EXCHANGE_CAPABILITY, 'record')
    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return {
            data: entity,
            meta: { schema: describeQuerySchema(clientTokenExchangeCapabilitySchema, RECORD_QUERY_PARAMETERS) },
        };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: ClientTokenExchangeCapabilityUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(id, data, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientTokenExchangeCapability>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }
}
