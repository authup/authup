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
    EntityRecordResponse,
    PathCreatePayload,
    PathUpdatePayload,
} from '@authup/core-http-kit';
import type { Path } from '@authup/core-kit';
import { EntityType } from '@authup/core-kit';
import type { IPathService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    pathSchema,
} from '../../../../../core/index.ts';
import { DQuerySchema } from '../../../decorators/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    applyRouteRealmIDToBody,
    buildActorContext,
    getRequestRealmID,
} from '../../../request/index.ts';

export type PathControllerContext = {
    service: IPathService,
};

@DTags('path')
@DController(['/paths', '/realms/:realmId/paths'])
export class PathController {
    protected service: IPathService;

    constructor(ctx: PathControllerContext) {
        this.service = ctx.service;
    }

    @DQuerySchema(EntityType.PATH, 'collection')
    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<Path>> {
        const actor = buildActorContext(event);

        const { data, meta } = await this.service.getMany(useRequestQuery(event), actor, { realmId: getRequestRealmID(event) });

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(pathSchema),
            },
        };
    }

    /**
     * A folder is addressed by id or by its FULL path, so only a ROOT folder
     * is reachable by name here: a nested path carries a separator and is
     * therefore never one route segment.
     */
    @DQuerySchema(EntityType.PATH, 'record')
    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<Path>> {
        const actor = buildActorContext(event);

        const entity = await this.service.getOne(id, actor, getRequestRealmID(event));

        return { data: entity, meta: { schema: describeQuerySchema(pathSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: PathCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<Path>> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: PathUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<Path>> {
        const actor = buildActorContext(event);

        const entity = await this.service.update(id, data, actor, getRequestRealmID(event));

        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<Path>> {
        const actor = buildActorContext(event);

        const entity = await this.service.delete(id, actor, getRequestRealmID(event));

        event.response.status = 202;

        return { data: entity, meta: {} };
    }
}
