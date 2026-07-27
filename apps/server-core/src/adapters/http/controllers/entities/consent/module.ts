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
import type { Consent } from '@authup/core-kit';
import type { IAppEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type {
    EntityCollectionResponse,
    EntityRecordWrappedResponse,
} from '@authup/core-http-kit';
import type { IConsentService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext, getRequestRealmID } from '../../../request/index.ts';

export type ConsentControllerContext = {
    service: IConsentService,
};

@DTags('consent')
@DController(['/consents', '/realms/:realmId/consents'])
export class ConsentController {
    protected service: IConsentService;

    constructor(ctx: ConsentControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IAppEvent,
    ): Promise<EntityCollectionResponse<Consent>> {
        const actor = buildActorContext(event);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(event), actor, { realmId: getRequestRealmID(event) });

        return {
            data,
            meta,
        };
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<Consent>> {
        const actor = buildActorContext(event);

        const entity = await this.service.getOne(id, actor, { realmId: getRequestRealmID(event) });

        return { data: entity, meta: {} };
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IAppEvent,
    ): Promise<EntityRecordWrappedResponse<Consent>> {
        const actor = buildActorContext(event);

        const entity = await this.service.delete(id, actor, { realmId: getRequestRealmID(event) });

        event.response.status = 202;
        return { data: entity, meta: {} };
    }
}
