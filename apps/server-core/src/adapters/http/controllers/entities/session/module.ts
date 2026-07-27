/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DContext,
    DController,
    DDelete,
    DGet,
    DPath,
    DTags,
} from '@routup/decorators';
import type { Session } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { EntityCollectionResponse, EntityRecordResponse, SessionDeleteManyResponse } from '@authup/core-http-kit';
import { isSelfToken } from '../../../../../utils/index.ts';
import type { ISessionService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    sessionSchema,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext, useRequestSessionId } from '../../../request/index.ts';

export type SessionControllerContext = {
    service: ISessionService,
};

@DTags('session')
@DController(['/sessions', '/realms/:realmId/sessions'])
export class SessionController {
    protected service: ISessionService;

    constructor(ctx: SessionControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<Session>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(sessionSchema),
            },
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<Session>> {
        const actor = buildActorContext(event);

        // `@me` / `@self` resolve to the caller's current session.
        const resolvedId = isSelfToken(id) ? (useRequestSessionId(event) ?? id) : id;

        const entity = await this.service.getOne(resolvedId, actor);

        return { data: entity, meta: { schema: describeQuerySchema(sessionSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DDelete('', [ForceLoggedInMiddleware])
    async dropMany(
        @DContext() event: IAppEvent,
    ): Promise<SessionDeleteManyResponse> {
        const actor = buildActorContext(event);

        // A recognized target filter (e.g. `?filter[userId]=<uuid>`) → admin
        // force-logout (SESSION_DELETE + per-session realm-match). No filter →
        // self-service "log out my other devices" (keeps the current session).
        const result = await this.service.deleteMany(actor, {
            query: useRequestQuery(event),
            currentSessionId: useRequestSessionId(event),
        });

        event.response.status = 202;
        return result;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<Session>> {
        const actor = buildActorContext(event);

        const resolvedId = isSelfToken(id) ? (useRequestSessionId(event) ?? id) : id;
        const entity = await this.service.delete(resolvedId, actor);

        event.response.status = 202;
        return { data: entity, meta: {} };
    }
}
