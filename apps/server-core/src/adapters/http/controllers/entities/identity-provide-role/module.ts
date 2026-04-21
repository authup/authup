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
import type { Request, Response } from 'routup';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { useRequestBody } from '@routup/basic/body';
import type {
    IIdentityPermissionProvider,
    IIdentityProviderRoleMappingRepository,
    IIdentityProviderRoleMappingService,
} from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    buildActorContext,
    useRequestIdentityOrFail,
    useRequestParamID,
} from '../../../request/index.ts';

export type IdentityProviderRoleMappingControllerContext = {
    service: IIdentityProviderRoleMappingService,
    repository: IIdentityProviderRoleMappingRepository,
    identityPermissionProvider: IIdentityPermissionProvider,
};

@DTags('identity-provider')
@DController('/identity-provider-role-mappings')
export class IdentityProviderRoleMappingController {
    protected service: IIdentityProviderRoleMappingService;

    protected repository: IIdentityProviderRoleMappingRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    constructor(ctx: IdentityProviderRoleMappingControllerContext) {
        this.service = ctx.service;
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const {
            data,
            meta,
        } = await this.service.getMany(useRequestQuery(req), actor);

        return send(res, {
            data,
            meta,
        });
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.getOne(useRequestParamID(req), actor);

        return send(res, entity);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: any,
        @DRequest() req: Request,
        @DResponse() res: Response,
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

        const entity = await this.service.create(useRequestBody(req), actor);

        return sendCreated(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
        @DBody() data: any,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.update(useRequestParamID(req), useRequestBody(req), actor);

        return sendAccepted(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const actor = buildActorContext(req);
        const entity = await this.service.delete(useRequestParamID(req), actor);

        return sendAccepted(res, entity);
    }
}
