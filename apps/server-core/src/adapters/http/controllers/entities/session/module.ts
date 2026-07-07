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
import { IdentityType } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { EntityCollectionResponse, SessionDeleteManyResponse } from '@authup/core-http-kit';
import { isSelfToken } from '../../../../../utils/index.ts';
import type { ISessionService } from '../../../../../core/index.ts';
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
            meta,
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<Session> {
        const actor = buildActorContext(event);

        // `@me` / `@self` resolve to the caller's current session.
        const resolvedId = isSelfToken(id) ? (useRequestSessionId(event) ?? id) : id;

        return this.service.getOne(resolvedId, actor);
    }

    @DDelete('', [ForceLoggedInMiddleware])
    async dropMany(
        @DContext() event: IAppEvent,
    ): Promise<SessionDeleteManyResponse> {
        const actor = buildActorContext(event);

        // `?user_id=<uuid>` → admin force-logout of that user everywhere
        // (SESSION_DELETE + per-session realm-match). No param → self-service
        // "log out my other devices" (keeps the current session).
        const userId = useRequestQuery(event)?.user_id;

        const result = userId ?
            await this.service.deleteManyForOwner(actor, {
                sub: String(userId),
                subKind: IdentityType.USER,
            }) :
            await this.service.deleteManyForActor(actor, useRequestSessionId(event));

        event.response.status = 202;
        return result;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<Session> {
        const actor = buildActorContext(event);

        const resolvedId = isSelfToken(id) ? (useRequestSessionId(event) ?? id) : id;
        const entity = await this.service.delete(resolvedId, actor);

        event.response.status = 202;
        return entity;
    }
}
