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
    IdentityProviderRoleMappingCreatePayload,
    IdentityProviderRoleMappingUpdatePayload,
} from '@authup/core-http-kit';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type {
    IIdentityProviderRoleMappingService,
} from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    identityProviderRoleMappingSchema,
} from '../../../../../core/index.ts';
import { DQuerySchema } from '../../../decorators/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
} from '../../../request/index.ts';

export type IdentityProviderRoleMappingControllerContext = {
    service: IIdentityProviderRoleMappingService,
};

@DTags('identity-provider')
@DConsumes('application/json', 'application/x-www-form-urlencoded')
@DController('/identity-provider-role-mappings')
export class IdentityProviderRoleMappingController {
    protected service: IIdentityProviderRoleMappingService;

    constructor(ctx: IdentityProviderRoleMappingControllerContext) {
        this.service = ctx.service;
    }

    @DQuerySchema(EntityType.IDENTITY_PROVIDER_ROLE_MAPPING, 'collection')
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<IdentityProviderRoleMapping>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(identityProviderRoleMappingSchema),
            },
        };
    }

    @DQuerySchema(EntityType.IDENTITY_PROVIDER_ROLE_MAPPING, 'record')
    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<IdentityProviderRoleMapping>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return { data: entity, meta: { schema: describeQuerySchema(identityProviderRoleMappingSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DPost('', [ForceLoggedInMiddleware])
    @DStatus(201)
    async add(
        @DBody() data: IdentityProviderRoleMappingCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<IdentityProviderRoleMapping>> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        return { data: entity, meta: {} };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    @DStatus(202)
    async edit(
        @DPath('id') id: string,
        @DBody() data: IdentityProviderRoleMappingUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<IdentityProviderRoleMapping>> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(id, data, actor);

        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    @DStatus(202)
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<IdentityProviderRoleMapping>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        return { data: entity, meta: {} };
    }
}
