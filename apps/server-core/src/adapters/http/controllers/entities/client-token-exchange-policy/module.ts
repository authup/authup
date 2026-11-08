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
    ClientTokenExchangePolicyCreatePayload,
    ClientTokenExchangePolicyUpdatePayload,
    EntityCollectionResponse,
    EntityRecordResponse,
} from '@authup/core-http-kit';
import type { ClientTokenExchangePolicy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { IClientTokenExchangePolicyService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    clientTokenExchangePolicySchema,
    describeQuerySchema,
} from '../../../../../core/index.ts';
import { DQuerySchema } from '../../../decorators/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type ClientTokenExchangePolicyControllerContext = {
    service: IClientTokenExchangePolicyService,
};

@DTags('client')
@DController('/client-token-exchange-policies')
export class ClientTokenExchangePolicyController {
    protected service: IClientTokenExchangePolicyService;

    constructor(ctx: ClientTokenExchangePolicyControllerContext) {
        this.service = ctx.service;
    }

    @DQuerySchema(EntityType.CLIENT_TOKEN_EXCHANGE_POLICY, 'collection')
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<ClientTokenExchangePolicy>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(clientTokenExchangePolicySchema),
            },
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: ClientTokenExchangePolicyCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientTokenExchangePolicy>> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    @DQuerySchema(EntityType.CLIENT_TOKEN_EXCHANGE_POLICY, 'record')
    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientTokenExchangePolicy>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return {
            data: entity,
            meta: { schema: describeQuerySchema(clientTokenExchangePolicySchema, RECORD_QUERY_PARAMETERS) },
        };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: ClientTokenExchangePolicyUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientTokenExchangePolicy>> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(id, data, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<ClientTokenExchangePolicy>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }
}
