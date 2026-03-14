/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { ForbiddenError } from '@ebec/http';
import type { ClientRole } from '@authup/core-kit';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { IClientRoleRepository, IClientRoleService } from '../../../../../core/index.ts';
import type { IdentityPermissionService } from '../../../../../services/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    RequestHandlerOperation,
    buildActorContext,
    useRequestIdentityOrFail,
    useRequestParamID,
} from '../../../request/index.ts';
import { ClientRoleRequestValidator } from './utils/index.ts';

export type ClientRoleControllerContext = {
    service: IClientRoleService,
    repository: IClientRoleRepository,
    identityPermissionService: IdentityPermissionService,
};

@DTags('client')
@DController('/client-roles')
export class ClientRoleController {
    protected service: IClientRoleService;

    protected repository: IClientRoleRepository;

    protected identityPermissionService: IdentityPermissionService;

    constructor(ctx: ClientRoleControllerContext) {
        this.service = ctx.service;
        this.repository = ctx.repository;
        this.identityPermissionService = ctx.identityPermissionService;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const { data, meta } = await this.service.getMany(useRequestQuery(req), actor);

        return send(res, { data, meta });
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<ClientRole, 'role_id' | 'client_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);

        const validator = new RoutupContainerAdapter(new ClientRoleRequestValidator());
        const validatedData = await validator.run(req, { group: RequestHandlerOperation.CREATE });

        await this.repository.validateJoinColumns(validatedData);

        if (validatedData.role) {
            const identity = useRequestIdentityOrFail(req);
            const hasPermissions = await this.identityPermissionService.isSuperset(identity, {
                type: 'role',
                id: validatedData.role.id,
                clientId: validatedData.role.client_id,
            });
            if (!hasPermissions) {
                throw new ForbiddenError('You don\'t own the required permissions.');
            }
        }

        const entity = await this.service.create(validatedData, actor);

        return sendCreated(res, entity);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.getOne(useRequestParamID(req), actor);

        return send(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.delete(useRequestParamID(req), actor);

        return sendAccepted(res, entity);
    }
}
