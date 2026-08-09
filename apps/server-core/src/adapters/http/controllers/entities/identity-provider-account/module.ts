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
import type { IdentityProviderAccount } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    EntityCollectionResponse,
    EntityRecordResponse,
} from '@authup/core-http-kit';
import type { IIdentityProviderAccountService } from '../../../../../core/index.ts';
import {
    RECORD_QUERY_PARAMETERS,
    describeQuerySchema,
    identityProviderAccountSchema,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext, getRequestRealmID } from '../../../request/index.ts';

export type IdentityProviderAccountControllerContext = {
    service: IIdentityProviderAccountService,
};

@DTags('identity')
@DController(['/identity-provider-accounts', '/realms/:realmId/identity-provider-accounts'])
export class IdentityProviderAccountController {
    protected service: IIdentityProviderAccountService;

    constructor(ctx: IdentityProviderAccountControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<IdentityProviderAccount>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor, { realmId: getRequestRealmID(event) });

        return {
            data,
            meta: {
                ...meta,
                schema: describeQuerySchema(identityProviderAccountSchema),
            },
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<IdentityProviderAccount>> {
        const actor = buildActorContext(event);

        const entity = await this.service.getOne(id, actor, { realmId: getRequestRealmID(event) });

        return { data: entity, meta: { schema: describeQuerySchema(identityProviderAccountSchema, RECORD_QUERY_PARAMETERS) } };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordResponse<IdentityProviderAccount>> {
        const actor = buildActorContext(event);

        const entity = await this.service.delete(id, actor, { realmId: getRequestRealmID(event) });

        event.response.status = 202;
        return { data: entity, meta: {} };
    }
}
