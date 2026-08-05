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

/**
 * Read the `usedClientId` request parameter: the "every session that served
 * application X" target, accepting a single id or a comma list.
 *
 * It is deliberately not a rapiq filter. `filter[clientId]` matches the
 * session's own column, which names only the client that FIRST authorized on
 * the row, and inferring intent from a user-supplied condition tree (what
 * does a negated or OR-nested value mean?) is not something a bulk delete
 * should be doing.
 */
function useRequestUsedClientIds(event: IAppEvent) : string[] | undefined {
    const raw = useRequestQuery(event)?.usedClientId;

    const values = (Array.isArray(raw) ? raw : [raw])
        .filter((value): value is string => typeof value === 'string')
        .flatMap((value) => value.split(','))
        .map((value) => value.trim())
        .filter((value) => value.length > 0);

    return values.length > 0 ? values : undefined;
}

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
        } = await this.service.getMany(useRequestQuery(event), actor, { clientIds: useRequestUsedClientIds(event) });

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
            clientIds: useRequestUsedClientIds(event),
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
