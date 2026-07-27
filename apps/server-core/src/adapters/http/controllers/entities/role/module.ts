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
    DPut,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    EntityCollectionResponse,
    EntityRecordWrappedResponse,
    RoleCreatePayload,
    RoleSavePayload,
    RoleUpdatePayload,
} from '@authup/core-http-kit';
import type { Role } from '@authup/core-kit';
import type { IRoleService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

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
    async getMany(@DContext() event: IAppEvent): Promise<EntityCollectionResponse<Role>> {
        const actor = buildActorContext(event);
        const { data, meta } = await this.service.getMany(useRequestQuery(event), actor);
        return { data, meta };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(@DBody() data: RoleCreatePayload, @DContext() event: IAppEvent): Promise<EntityRecordWrappedResponse<Role>> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);
        event.response.status = 201;
        return { data: entity, meta: {} };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(@DPath('id') id: string, @DContext() event: IAppEvent): Promise<EntityRecordWrappedResponse<Role>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return { data: entity, meta: {} };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: RoleUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<Role>> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(id, data, actor);
        event.response.status = 202;
        return { data: entity, meta: {} };
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() data: RoleSavePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<Role>> {
        const actor = buildActorContext(event);
        const { entity, created } = await this.service.save(id || undefined, data, actor);

        event.response.status = created ? 201 : 202;
        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(@DPath('id') id: string, @DContext() event: IAppEvent): Promise<EntityRecordWrappedResponse<Role>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);
        event.response.status = 202;
        return { data: entity, meta: {} };
    }
}
