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
    DTags,
} from '@routup/decorators';
import type { IRoutupEvent } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { IRobotPermissionService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { buildActorContext } from '../../../request/index.ts';

export type RobotPermissionControllerContext = {
    service: IRobotPermissionService,
};

@DTags('robot')
@DController('/robot-permissions')
export class RobotPermissionController {
    protected service: IRobotPermissionService;

    constructor(ctx: RobotPermissionControllerContext) {
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

        event.response.status = 201;

        return entity;
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: any,
        @DContext() event: IRoutupEvent,
    ): Promise<any> {
        const actor = buildActorContext(event);
        const entity = await this.service.update(id, data, actor);

        event.response.status = 202;

        return entity;
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
        const entity = await this.service.delete(
            id,
            actor,
        );

        event.response.status = 202;

        return entity;
    }
}
