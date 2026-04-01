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
import type { IClientRoleRepository, IClientRoleService, IIdentityPermissionProvider } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
    useRequestIdentityOrFail,
} from '../../../request/index.ts';

export type ClientRoleControllerContext = {
    service: IClientRoleService,
    repository: IClientRoleRepository,
    identityPermissionProvider: IIdentityPermissionProvider,
};

@DTags('client')
@DController('/client-roles')
export class ClientRoleController {
    protected service: IClientRoleService;

    protected repository: IClientRoleRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    constructor(ctx: ClientRoleControllerContext) {
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
                id: data.role.id,
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
