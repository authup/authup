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
    ScopeCreatePayload,
    ScopeSavePayload,
    ScopeUpdatePayload,
} from '@authup/core-http-kit';
import type { Scope } from '@authup/core-kit';
import type { IScopeService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type ScopeControllerContext = {
    service: IScopeService,
};

@DTags('scope')
@DController('/scopes')
export class ScopeController {
    protected service: IScopeService;

    constructor(ctx: ScopeControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<Scope>> {
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
        @DBody() data: ScopeCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<Scope> {
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return entity;
    }

    @DGet('/:id', [])
    async get(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<Scope> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(
            id,
            actor,
        );

        return entity;
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: ScopeUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<Scope> {
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
        @DBody() data: ScopeSavePayload,
        @DContext() event: IAppEvent,
    ): Promise<Scope> {
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
        @DContext() event: IAppEvent,
    ): Promise<Scope> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return entity;
    }
}
