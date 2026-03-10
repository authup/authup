/*
 * Copyright (c) 2022.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    DBody, DController, DDelete, DGet, DPath, DPost, DRequest, DResponse, DTags,
} from '@routup/decorators';
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { ClientRole } from '@authup/core-kit';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { IClientRoleRepository } from '../../../../../core/entities/client-role/types.ts';
import type { IdentityPermissionService } from '../../../../../services/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    RequestHandlerOperation,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionChecker,
} from '../../../request/index.ts';
import { ClientRoleRequestValidator } from './utils/index.ts';

export type ClientRoleControllerContext = {
    repository: IClientRoleRepository,
    identityPermissionService: IdentityPermissionService,
};

@DTags('client')
@DController('/client-roles')
export class ClientRoleController {
    protected repository: IClientRoleRepository;

    protected identityPermissionService: IdentityPermissionService;

    constructor(ctx: ClientRoleControllerContext) {
        this.repository = ctx.repository;
        this.identityPermissionService = ctx.identityPermissionService;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.CLIENT_ROLE_READ,
                PermissionName.CLIENT_ROLE_UPDATE,
                PermissionName.CLIENT_ROLE_DELETE,
            ],
        });

        const { data, meta } = await this.repository.findMany(useRequestQuery(req));

        return send(res, {
            data,
            meta,
        });
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() data: Pick<ClientRole, 'role_id' | 'client_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.CLIENT_ROLE_CREATE });

        const validator = new ClientRoleRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const validatedData = await validatorAdapter.run(req, {
            group: RequestHandlerOperation.CREATE,
        });

        await this.repository.validateJoinColumns(validatedData);

        const policyData = new PolicyData();
        policyData.set(BuiltInPolicyType.ATTRIBUTES, validatedData);

        if (validatedData.role) {
            validatedData.role_realm_id = validatedData.role.realm_id;

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

        if (validatedData.client) {
            validatedData.client_realm_id = validatedData.client.realm_id;
        }

        await permissionChecker.check({
            name: PermissionName.CLIENT_ROLE_CREATE,
            input: policyData,
        });

        let entity = this.repository.create(validatedData);
        entity = await this.repository.save(entity);

        return sendCreated(res, entity);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async getOne(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.CLIENT_ROLE_READ,
                PermissionName.CLIENT_ROLE_UPDATE,
                PermissionName.CLIENT_ROLE_DELETE,
            ],
        });

        const paramId = useRequestParamID(req);

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        return send(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const paramId = useRequestParamID(req);

        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.CLIENT_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionChecker.check({
            name: PermissionName.CLIENT_ROLE_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);

        entity.id = entityId;

        return sendAccepted(res, entity);
    }
}
