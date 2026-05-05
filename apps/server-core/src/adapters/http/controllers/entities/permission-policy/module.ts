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
import type { IRoutupEvent } from 'routup';
import { sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { IPermissionPolicyService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type PermissionPolicyControllerContext = {
    service: IPermissionPolicyService,
};

@DTags('permission')
@DController('/permission-policies')
export class PermissionPolicyController {
    protected service: IPermissionPolicyService;

    constructor(ctx: PermissionPolicyControllerContext) {
        this.service = ctx.service;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
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

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const actor = buildActorContext(event);

        const entity = await this.service.create(data, actor);

        return sendCreated(event, entity);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.getOne(id, actor);

        return entity;
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.delete(id, actor);

        return sendAccepted(event, entity);
    }
}
