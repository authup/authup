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
    EntityRecordResponse,
    UserCreatePayload,
    UserSavePayload,
    UserUpdatePayload,
} from '@authup/core-http-kit';
import type { User } from '@authup/core-kit';
import type { IUserService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    userSchema,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    applyRouteRealmIDToBody,
    buildActorContext,
    getRequestRealmID,
} from '../../../request/index.ts';
import { isSelfToken } from '../../../../../utils/index.ts';

export type UserControllerContext = {
    service: IUserService,
};

@DTags('user')
@DController(['/users', '/realms/:realmId/users'])
export class UserController {
    protected service: IUserService;

    constructor(ctx: UserControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<User>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor);

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(userSchema),
            },
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<User>> {
        const actor = buildActorContext(event);
        let paramId = id;

        if (
            isSelfToken(paramId) &&
            actor.identity &&
            actor.identity.type === 'user'
        ) {
            paramId = actor.identity.data.id;
        }

        const entity = await this.service.getOne(
            paramId,
            actor,
            useRequestQuery(event),
            getRequestRealmID(event),
        );

        return { data: entity, meta: { schema: describeQuerySchema(userSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: UserCreatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<User>> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);
        const entity = await this.service.create(data, actor);

        event.response.status = 201;

        return { data: entity, meta: {} };
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: UserUpdatePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<User>> {
        applyRouteRealmIDToBody(event, data);
        const actor = buildActorContext(event);
        const entity = await this.service.update(
            id,
            data,
            actor,
        );

        event.response.status = 202;

        return { data: entity, meta: {} };
    }

    @DPut('/:id', [ForceLoggedInMiddleware])
    async put(
        @DPath('id') id: string,
        @DBody() data: UserSavePayload,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<User>> {
        applyRouteRealmIDToBody(event, data);
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
        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<User>> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        event.response.status = 202;

        return { data: entity, meta: {} };
    }
}
