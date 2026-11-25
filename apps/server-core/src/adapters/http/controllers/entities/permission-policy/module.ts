/*
 * Copyright (c) 2026.
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
    PermissionPolicyCreatePayload,
} from '@authup/core-http-kit';
import type { PermissionPolicy } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { IPermissionPolicyService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    permissionPolicySchema,
} from '../../../../../core/index.ts';
import { DQuerySchema } from '../../../decorators/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type PermissionPolicyControllerContext = {
    service: IPermissionPolicyService,
};

@DTags('permission')
@DConsumes('application/json', 'application/x-www-form-urlencoded')
@DController('/permission-policies')
export class PermissionPolicyController {
    protected service: IPermissionPolicyService;

    constructor(ctx: PermissionPolicyControllerContext) {
        this.service = ctx.service;
    }

    @DQuerySchema(EntityType.PERMISSION_POLICY, 'collection')
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<PermissionPolicy>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(permissionPolicySchema),
            },
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    @DStatus(201)
    async add(
        @DBody() data: PermissionPolicyCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<PermissionPolicy>> {
        const actor = buildActorContext(event);

        const entity = await this.service.create(data, actor);

        return { data: entity, meta: {} };
    }

    @DQuerySchema(EntityType.PERMISSION_POLICY, 'record')
    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<PermissionPolicy>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return { data: entity, meta: { schema: describeQuerySchema(permissionPolicySchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    @DStatus(202)
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<PermissionPolicy>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        return { data: entity, meta: {} };
    }
}
