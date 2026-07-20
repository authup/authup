/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EntityCollectionResponse,
    TrustAnchorCreatePayload,
    TrustAnchorUpdatePayload,
} from '@authup/core-http-kit';
import type { TrustAnchor } from '@authup/core-kit';
import { useRequestQuery } from '@routup/basic/query';
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
import type { ITrustAnchorService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    applyRouteRealmIDToBody,
    buildActorContext,
    getRequestRealmID,
} from '../../../request/index.ts';

export type TrustAnchorControllerContext = {
    service: ITrustAnchorService,
};

@DTags('trust-anchor')
@DController(['/trust-anchors', '/realms/:realmId/trust-anchors'])
export class TrustAnchorController {
    protected service: ITrustAnchorService;

    constructor(ctx: TrustAnchorControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<TrustAnchor>> {
        const actor = buildActorContext(event);

        const { data, meta } = await this.service.getMany(useRequestQuery(event), actor, { realmId: getRequestRealmID(event) });

        return {
            data,
            meta,
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<TrustAnchor> {
        const actor = buildActorContext(event);

        return this.service.getOne(id, actor, getRequestRealmID(event));
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: TrustAnchorCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<TrustAnchor> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return entity;
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: TrustAnchorUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<TrustAnchor> {
        const actor = buildActorContext(event);

        return this.service.update(id, data, actor, getRequestRealmID(event));
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<TrustAnchor> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return entity;
    }
}
