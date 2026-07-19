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
import { IdentityType } from '@authup/core-kit';
import type { UserAuthenticator } from '@authup/core-kit';
import { BadRequestError } from '@authup/errors';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    EntityCollectionResponse,
    UserAuthenticatorConfirmPayload,
    UserAuthenticatorCreatePayload,
    UserAuthenticatorEnrollResponse,
} from '@authup/core-http-kit';
import { isSelfToken } from '../../../../../utils/index.ts';
import type { IUserAuthenticatorService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext, useRequestIdentity } from '../../../request/index.ts';

export type UserAuthenticatorControllerContext = {
    service: IUserAuthenticatorService,
};

@DTags('userAuthenticator')
@DController('/users/:id/authenticators')
export class UserAuthenticatorController {
    protected service: IUserAuthenticatorService;

    constructor(ctx: UserAuthenticatorControllerContext) {
        this.service = ctx.service;
    }

    /**
     * `@me` / `@self` resolve to the calling user identity.
     */
    protected resolveUserId(id: string, event: IAppEvent): string {
        if (isSelfToken(id)) {
            const identity = useRequestIdentity(event);
            if (identity && identity.type === IdentityType.USER) {
                return identity.id;
            }

            // A non-user identity (client) has no authenticator
            // namespace — fail loud instead of letting the literal token
            // fall through and silently match zero rows.
            throw new BadRequestError('The @me/@self token can only be used by a user identity.');
        }

        return id;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<UserAuthenticator>> {
        const actor = buildActorContext(event);
        const userId = this.resolveUserId(id, event);

        const { data, meta } = await this.service.getMany(useRequestQuery(event), actor, { userId });

        return {
            data,
            meta,
        };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async enroll(
        @DPath('id') id: string,
        @DBody() data: UserAuthenticatorCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<UserAuthenticatorEnrollResponse> {
        const actor = buildActorContext(event);
        const userId = this.resolveUserId(id, event);

        // route wins silently over body
        const result = await this.service.enroll({ ...data, userId }, actor);

        event.response.status = 201;
        return result;
    }

    @DGet('/:deviceId', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DPath('deviceId') deviceId: string,
        @DContext() event: IAppEvent,
    ): Promise<UserAuthenticator> {
        const actor = buildActorContext(event);
        const userId = this.resolveUserId(id, event);

        return this.service.getOne(deviceId, actor, { userId });
    }

    @DPost('/:deviceId/confirm', [ForceLoggedInMiddleware])
    async confirm(
        @DPath('id') id: string,
        @DPath('deviceId') deviceId: string,
        @DBody() data: UserAuthenticatorConfirmPayload,
        @DContext() event: IAppEvent,
    ): Promise<UserAuthenticator> {
        const actor = buildActorContext(event);
        const userId = this.resolveUserId(id, event);

        if (!data || typeof data.code !== 'string' || !data.code) {
            throw new BadRequestError('A code must be provided.');
        }

        return this.service.confirm(deviceId, data.code, actor, { userId });
    }

    @DDelete('/:deviceId', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DPath('deviceId') deviceId: string,
        @DContext() event: IAppEvent,
    ): Promise<UserAuthenticator> {
        const actor = buildActorContext(event);
        const userId = this.resolveUserId(id, event);

        const entity = await this.service.delete(deviceId, actor, { userId });

        event.response.status = 202;
        return entity;
    }
}
