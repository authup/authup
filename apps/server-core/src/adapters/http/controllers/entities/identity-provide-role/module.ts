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
import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { BadRequestError, ForbiddenError, NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import type { Request, Response } from 'routup';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { IIdentityPermissionProvider, IIdentityProviderRoleMappingRepository } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { IdentityProviderRoleMappingRequestValidator } from './utils/index.ts';
import {
    RequestHandlerOperation,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionEvaluator,
} from '../../../request/index.ts';

export type OAuth2ProviderRoleControllerContext = {
    repository: IIdentityProviderRoleMappingRepository,
    identityPermissionProvider: IIdentityPermissionProvider,
};

@DTags('identity-provider')
@DController('/identity-provider-role-mappings')
export class OAuth2ProviderRoleController {
    protected repository: IIdentityProviderRoleMappingRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    constructor(ctx: OAuth2ProviderRoleControllerContext) {
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
    }

    @DGet('', [])
    async getProviders(
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const permissionEvaluator = useRequestPermissionEvaluator(req);
        await permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.IDENTITY_PROVIDER_READ,
                PermissionName.IDENTITY_PROVIDER_UPDATE,
                PermissionName.IDENTITY_PROVIDER_DELETE,
            ],
        });

        const {
            data, 
            meta, 
        } = await this.repository.findMany(useRequestQuery(req));

        return send(res, {
            data,
            meta,
        });
    }

    @DGet('/:id', [])
    async getProvider(
        @DPath('id') id: string,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const permissionEvaluator = useRequestPermissionEvaluator(req);
        await permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.IDENTITY_PROVIDER_READ,
                PermissionName.IDENTITY_PROVIDER_UPDATE,
                PermissionName.IDENTITY_PROVIDER_DELETE,
            ],
        });

        const paramId = useRequestParamID(req);

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        return send(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async editProvider(
        @DPath('id') id: string,
        @DBody() user: NonNullable<IdentityProviderRoleMapping>,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const paramId = useRequestParamID(req);

        const permissionEvaluator = useRequestPermissionEvaluator(req);
        await permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE });

        const validator = new IdentityProviderRoleMappingRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, { group: RequestHandlerOperation.UPDATE });

        await this.repository.validateJoinColumns(data);

        let entity = await this.repository.findOneBy({ id: paramId });
        if (!entity) {
            throw new NotFoundError();
        }

        entity = this.repository.merge(entity, data);

        await permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        await this.repository.save(entity);

        return sendAccepted(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async dropProvider(
        @DPath('id') id: string,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const paramId = useRequestParamID(req);

        const permissionEvaluator = useRequestPermissionEvaluator(req);
        await permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });
        if (!entity) {
            throw new NotFoundError();
        }

        await permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_ROLE_DELETE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;

        await this.repository.remove(entity);

        entity.id = entityId;

        return sendAccepted(res);
    }

    @DPost('', [ForceLoggedInMiddleware])
    async addProvider(
        @DBody() user: NonNullable<IdentityProviderRoleMapping>,
        @DRequest() req: Request,
        @DResponse() res: Response,
    ): Promise<any> {
        const permissionEvaluator = useRequestPermissionEvaluator(req);
        await permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ROLE_CREATE });

        const validator = new IdentityProviderRoleMappingRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);

        const data = await validatorAdapter.run(req, { group: RequestHandlerOperation.CREATE });

        await this.repository.validateJoinColumns(data);

        if (data.provider) {
            data.provider_realm_id = data.provider.realm_id;
        }

        if (data.role) {
            data.role_realm_id = data.role.realm_id;
        }

        if (
            data.role_realm_id &&
            data.provider_realm_id &&
            data.role_realm_id !== data.provider_realm_id
        ) {
            throw new BadRequestError('It is not possible to map an identity provider to a role of another realm.');
        }

        await permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_ROLE_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: data }),
        });

        const identity = useRequestIdentityOrFail(req);
        const hasPermissions = await this.identityPermissionProvider.isSuperset(identity, {
            type: 'role',
            id: data.role_id,
            clientId: data.role.client_id,
        });
        if (!hasPermissions) {
            throw new ForbiddenError('You don\'t own the required permissions.');
        }

        const entity = this.repository.create(data);

        await this.repository.save(entity);

        return sendCreated(res, entity);
    }
}
