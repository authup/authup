/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EntityCollectionResponse,
    PermissionAPICheckResponse,
    PermissionCreatePayload,
    PermissionSavePayload,
    PermissionUpdatePayload,
} from '@authup/core-http-kit';
import type { Permission } from '@authup/core-kit';
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
import type { IRoutupEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    IPermissionCheckerService,
    IPermissionService,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type PermissionControllerContext = {
    service: IPermissionService,
    checkerService: IPermissionCheckerService,
};

@DTags('permission')
@DController('/permissions')
export class PermissionController {
    protected service: IPermissionService;

    protected checkerService: IPermissionCheckerService;

    constructor(ctx: PermissionControllerContext) {
        this.service = ctx.service;
        this.checkerService = ctx.checkerService;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IRoutupEvent,
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
        @DContext() event: IRoutupEvent,
    ): Promise<Permission> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return entity;
    }

    @DPost('/:id/check', [ForceLoggedInMiddleware])
    async check(
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ): Promise<PermissionAPICheckResponse> {
        const actor = buildActorContext(event);
        const result = await this.checkerService.check(
            event.params.id,
            data,
            actor,
            event.params.realmId,
        );

        event.response.status = 202;
        return result;
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ): Promise<Permission> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(
            id,
            actor,
            event.params.realmId,
        );

        return entity;
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: PermissionUpdatePayload,
        @DContext() event: IRoutupEvent,
    ): Promise<Permission> {
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
    async put(
        @DPath('id') id: string,
        @DBody() data: PermissionSavePayload,
        @DContext() event: IRoutupEvent,
    ): Promise<Permission> {
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
    ): Promise<Permission> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return entity;
    }
}
