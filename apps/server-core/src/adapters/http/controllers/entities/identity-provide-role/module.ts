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
    EntityCollectionResponse,
    EntityRecordWrappedResponse,
    IdentityProviderRoleMappingCreatePayload,
    IdentityProviderRoleMappingUpdatePayload,
} from '@authup/core-http-kit';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import type {
    IIdentityProviderRoleMappingService,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
} from '../../../request/index.ts';

export type IdentityProviderRoleMappingControllerContext = {
    service: IIdentityProviderRoleMappingService,
};

@DTags('identity-provider')
@DController('/identity-provider-role-mappings')
export class IdentityProviderRoleMappingController {
    protected service: IIdentityProviderRoleMappingService;

    constructor(ctx: IdentityProviderRoleMappingControllerContext) {
        this.service = ctx.service;
    }

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
            meta,
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<IdentityProviderRoleMapping>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return { data: entity, meta: {} };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: IdentityProviderRoleMappingCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<IdentityProviderRoleMapping>> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: IdentityProviderRoleMappingUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<IdentityProviderRoleMapping>> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(id, data, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<IdentityProviderRoleMapping>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }
}
