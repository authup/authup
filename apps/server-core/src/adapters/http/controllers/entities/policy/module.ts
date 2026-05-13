/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EntityCollectionResponse,
    PolicyAPICheckResponse,
    PolicyCreatePayload,
    PolicyResponse,
    PolicySavePayload,
    PolicyUpdatePayload,
} from '@authup/core-http-kit';
import { serializeError } from '@authup/errors';
import {
    DBody,
    DContext,
    DController,
    DDelete,
    DGet,
    DPath,
    DPost,
    DPut,
    DTags,
} from '@routup/decorators';
import { useRequestQuery } from '@routup/basic/query';
import type { IRoutupEvent } from 'routup';
import type {
    IPolicyCheckerService,
    IPolicyService,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    applyRouteRealmIDToBody,
    buildActorContext,
    getRequestRealmID,
} from '../../../request/index.ts';

export type PolicyControllerContext = {
    service: IPolicyService,
    checkerService: IPolicyCheckerService,
};

@DTags('policy')
@DController(['/policies', '/realms/:realmId/policies'])
export class PolicyController {
    protected service: IPolicyService;

    protected checkerService: IPolicyCheckerService;

    constructor(ctx: PolicyControllerContext) {
        this.service = ctx.service;
        this.checkerService = ctx.checkerService;
    }

    @DGet('', [])
    async getMany(
        @DContext() event: IRoutupEvent,
    ): Promise<EntityCollectionResponse<PolicyResponse>> {
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

    @DGet('/:id/expanded', [])
    async getOneExpanded(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ): Promise<PolicyResponse> {
        return this.getOne(id, event, { expanded: true });
    }

    @DGet('/:id', [])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        options: { expanded?: boolean } = {},
    ): Promise<PolicyResponse> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(
            id,
            actor,
            getRequestRealmID(event),
        );

        return entity;
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DPath('id') id: string,
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ): Promise<PolicyAPICheckResponse> {
        const actor = buildActorContext(event);
        const result = await this.checkerService.safeCheck(
            id,
            data,
            actor,
            getRequestRealmID(event),
        );

        event.response.status = 202;
        if (result.success) {
            return { status: 'success' };
        }

        return {
            status: 'error',
            data: serializeError(result.error),
        };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async update(
        @DPath('id') id: string,
        @DBody() data: PolicyUpdatePayload,
        @DContext() event: IRoutupEvent,
    ): Promise<PolicyResponse> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);
        const entity = await this.service.update(
            id,
            data,
            actor,
        );

        event.response.status = 202;

        return entity;
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async replace(
        @DPath('id') id: string,
        @DBody() data: PolicySavePayload,
        @DContext() event: IRoutupEvent,
    ): Promise<PolicyResponse> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);

        const {
            entity,
            created,
        } = await this.service.save(
            id || undefined,
            data,
            actor,
        );

        event.response.status = created ? 201 : 202;
        return entity;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ): Promise<PolicyResponse> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return entity;
    }

    @DPost('', [ForceLoggedInMiddleware])
    async create(
        @DBody() data: PolicyCreatePayload,
        @DContext() event: IRoutupEvent,
    ): Promise<PolicyResponse> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return entity;
    }
}
