/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody,
    DConsumes,
    DContext,
    DController,
    DDelete,
    DGet,
    DPath,
    DPost,
    DStatus,
    DTags,
} from '@routup/decorators';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    EntityCollectionResponse,
    EntityRecordResponse,
    RolePermissionCreatePayload,
    RolePermissionUpdatePayload,
} from '@authup/core-http-kit';
import type { RolePermission } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { IRolePermissionService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    rolePermissionSchema,
} from '../../../../../core/index.ts';
import { DQuerySchema } from '../../../decorators/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type RolePermissionControllerContext = {
    service: IRolePermissionService,
};

@DTags('role')
@DConsumes('application/json', 'application/x-www-form-urlencoded')
@DController('/role-permissions')
export class RolePermissionController {
    protected service: IRolePermissionService;

    constructor(ctx: RolePermissionControllerContext) {
        this.service = ctx.service;
    }

    @DQuerySchema(EntityType.ROLE_PERMISSION, 'collection')
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<RolePermission>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(rolePermissionSchema),
            },
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    @DStatus(201)
    async add(
        @DBody() data: RolePermissionCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<RolePermission>> {
        const actor = buildActorContext(event);

        const entity = await this.service.create(data, actor);

        return { data: entity, meta: {} };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    @DStatus(202)
    async edit(
        @DPath('id') id: string,
        @DBody() data: RolePermissionUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<RolePermission>> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(id, data, actor);

        return { data: entity, meta: {} };
    }

    @DQuerySchema(EntityType.ROLE_PERMISSION, 'record')
    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<RolePermission>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return { data: entity, meta: { schema: describeQuerySchema(rolePermissionSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    @DStatus(202)
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<RolePermission>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        return { data: entity, meta: {} };
    }
}
