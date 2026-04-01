/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, 
    DController, 
    DDelete, 
    DGet, 
    DPath, 
    DPost, 
    DRequest, 
    DResponse, 
    DTags,
} from '@routup/decorators';
import { ForbiddenError } from '@ebec/http';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import type { IIdentityPermissionProvider, IRobotRoleRepository, IRobotRoleService } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
    useRequestIdentityOrFail,
} from '../../../request/index.ts';

export type RobotRoleControllerContext = {
    service: IRobotRoleService,
    repository: IRobotRoleRepository,
    identityPermissionProvider: IIdentityPermissionProvider,
};

@DTags('robot')
@DController('/robot-roles')
export class RobotRoleController {
    protected service: IRobotRoleService;

    protected repository: IRobotRoleRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    constructor(ctx: RobotRoleControllerContext) {
        this.service = ctx.service;
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const {
            data, 
            meta 
        } = await this.service.getMany(useRequestQuery(req), actor);

        return send(res, {
            data,
            meta 
        });
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: any,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);

        await this.repository.validateJoinColumns(data);

        if (data.role) {
            const identity = useRequestIdentityOrFail(req);
            const hasPermissions = await this.identityPermissionProvider.isSuperset(identity, {
                type: 'role',
                id: data.role_id,
                clientId: data.role.client_id,
            });
            if (!hasPermissions) {
                throw new ForbiddenError('You don\'t own the required permissions.');
            }
        }

        const entity = await this.service.create(data, actor);

        return sendCreated(res, entity);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.getOne(id, actor);

        return send(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DRequest() req: any,
        @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.delete(id, actor);

        return sendAccepted(res, entity);
    }
}
