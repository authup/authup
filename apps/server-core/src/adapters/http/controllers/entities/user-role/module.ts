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
import type { UserRole } from '@authup/core-kit';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { useRequestBody } from '@routup/basic/body';
import type { IUserRoleRepository, IUserRoleService } from '../../../../../core/index.ts';
import type { IdentityPermissionService } from '../../../../../services/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
    useRequestIdentityOrFail,
    useRequestParamID,
} from '../../../request/index.ts';

export type UserRoleControllerContext = {
    service: IUserRoleService,
    repository: IUserRoleRepository,
    identityPermissionService: IdentityPermissionService,
};

@DTags('user')
@DController('/user-roles')
export class UserRoleController {
    protected service: IUserRoleService;

    protected repository: IUserRoleRepository;

    protected identityPermissionService: IdentityPermissionService;

    constructor(ctx: UserRoleControllerContext) {
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
        @DBody() body: Pick<UserRole, 'role_id' | 'user_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const actor = buildActorContext(req);

        const data = useRequestBody(req);

        await this.repository.validateJoinColumns(data);

        if (data.role) {
            const identity = useRequestIdentityOrFail(req);
            const hasPermissions = await this.identityPermissionService.isSuperset(identity, {
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
