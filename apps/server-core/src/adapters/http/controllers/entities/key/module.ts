/*
 * Copyright (c) 2026.
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
    KeyCreatePayload,
    KeyUpdatePayload,
} from '@authup/core-http-kit';
import type { Key } from '@authup/core-kit';
import type { IKeyService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    applyRouteRealmIDToBody,
    buildActorContext,
    getRequestRealmID,
} from '../../../request/index.ts';

export type KeyControllerContext = {
    service: IKeyService,
};

@DTags('key')
@DController(['/keys', '/realms/:realmId/keys'])
export class KeyController {
    protected service: IKeyService;

    constructor(ctx: KeyControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<Key>> {
        const actor = buildActorContext(event);

        const query = useRequestQuery(event);
        const realmId = getRequestRealmID(event);
        if (realmId) {
            query.filter = {
                ...(query.filter && typeof query.filter === 'object' ? query.filter : {}),
                realmId,
            };
        }

        const { data, meta } = await this.service.getMany(query, actor);

        return {
            data,
            meta,
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<Key> {
        const actor = buildActorContext(event);

        return this.service.getOne(id, actor, getRequestRealmID(event));
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: KeyCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<Key> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return entity;
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: KeyUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<Key> {
        const actor = buildActorContext(event);

        return this.service.update(id, data, actor, getRequestRealmID(event));
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<Key> {
        const actor = buildActorContext(event);

        const query = useRequestQuery(event);
        const force = query.force === 'true' || query.force === '1';

        const entity = await this.service.delete(id, actor, { force });

        event.response.status = 202;

        return entity;
    }
}
