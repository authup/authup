/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EntityCollectionResponse,
    EntityRecordWrappedResponse,
    PermissionAPICheckResponse,
    PermissionCreatePayload,
    PermissionSavePayload,
    PermissionUpdatePayload,
} from '@authup/core-http-kit';
import type { Permission } from '@authup/core-kit';
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
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    IPermissionCheckerService,
    IPermissionService,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    applyRouteRealmIDToBody,
    buildActorContext,
    getRequestRealmID,
} from '../../../request/index.ts';

export type PermissionControllerContext = {
    service: IPermissionService,
    checkerService: IPermissionCheckerService,
};

@DTags('permission')
@DController(['/permissions', '/realms/:realmId/permissions'])
export class PermissionController {
    protected service: IPermissionService;

    protected checkerService: IPermissionCheckerService;

    constructor(ctx: PermissionControllerContext) {
        this.service = ctx.service;
        this.checkerService = ctx.checkerService;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<Permission>> {
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
        @DBody() data: PermissionCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<Permission>> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DPath('id') id: string,
        @DBody() data: any,
        @DContext() event: IAppEvent,
    ): Promise<PermissionAPICheckResponse> {
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

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<Permission>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(
            id,
            actor,
            getRequestRealmID(event),
        );

        return { data: entity, meta: {} };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: PermissionUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<Permission>> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);
        const entity = await this.service.update(
            id,
            data,
            actor,
        );

        event.response.status = 202;

        return { data: entity, meta: {} };
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() data: PermissionSavePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<Permission>> {
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
        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<Permission>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }
}
