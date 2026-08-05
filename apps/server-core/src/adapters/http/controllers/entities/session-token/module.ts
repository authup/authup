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
import type { SessionToken } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { EntityCollectionResponse, EntityRecordResponse } from '@authup/core-http-kit';
import type { ISessionTokenService, SessionTokenDeleteManyResult } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    sessionTokenSchema,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type SessionTokenControllerContext = {
    service: ISessionTokenService,
};

@DTags('session-token')
@DController(['/session-tokens'])
export class SessionTokenController {
    protected service: ISessionTokenService;

    constructor(ctx: SessionTokenControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<SessionToken>> {
        const actor = buildActorContext(event);
        const { data, meta } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(sessionTokenSchema),
            },
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<SessionToken>> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return {
            data: entity,
            meta: { schema: describeQuerySchema(sessionTokenSchema, RECORD_QUERY_PARAMETERS) },
        };
    }

    /**
     * Revoke every token matching the query. Requires a target filter, so it
     * cannot degenerate into an unscoped mass revoke.
     *
     * Scoped to one client this is "sign out of this application": the session
     * itself survives, so the other applications riding it stay signed in.
     */
    @DDelete('', [ForceLoggedInMiddleware])
    async dropMany(
        @DContext() event: IAppEvent,
    ): Promise<SessionTokenDeleteManyResult> {
        const actor = buildActorContext(event);
        const result = await this.service.deleteMany(useRequestQuery(event), actor);

        event.response.status = 202;
        return result;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<SessionToken>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;
        return { data: entity, meta: {} };
    }
}
