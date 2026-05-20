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
    ClientRoleCreatePayload,
    EntityCollectionResponse,
} from '@authup/core-http-kit';
import type { ClientRole } from '@authup/core-kit';
import type { IClientRoleService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
} from '../../../request/index.ts';

export type ClientRoleControllerContext = {
    service: IClientRoleService,
};

@DTags('client')
@DController('/client-roles')
export class ClientRoleController {
    protected service: IClientRoleService;

    constructor(ctx: ClientRoleControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<ClientRole>> {
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
        @DBody() data: ClientRoleCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<ClientRole> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return entity;
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<ClientRole> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return entity;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<ClientRole> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return entity;
    }
}
