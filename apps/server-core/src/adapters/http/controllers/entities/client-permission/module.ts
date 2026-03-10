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
import { PermissionName } from '@authup/core-kit';
import type { ClientPermission } from '@authup/core-kit';
import { NotFoundError } from '@ebec/http';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { IClientPermissionRepository } from '../../../../../core/entities/client-permission/types.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import {
    RequestHandlerOperation,
    useRequestParamID,
    useRequestPermissionChecker,
} from '../../../request/index.ts';
import { ClientPermissionRequestValidator } from './utils/index.ts';

export type ClientPermissionControllerContext = {
    repository: IClientPermissionRepository,
};

@DTags('client')
@DController('/client-permissions')
export class ClientPermissionController {
    protected repository: IClientPermissionRepository;

    constructor(ctx: ClientPermissionControllerContext) {
        this.repository = ctx.repository;
    }

    @DGet('', [ForceLoggedInMiddleware])
    async getMany(
        @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.CLIENT_PERMISSION_CREATE,
                PermissionName.CLIENT_PERMISSION_DELETE,
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
        @DBody() data: Pick<ClientPermission, 'client_id' | 'permission_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.CLIENT_PERMISSION_CREATE });

        const validator = new ClientPermissionRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const validatedData = await validatorAdapter.run(req, {
            group: RequestHandlerOperation.CREATE,
        });

        await this.repository.validateJoinColumns(validatedData);

        const policyData = new PolicyData();
        policyData.set(BuiltInPolicyType.ATTRIBUTES, validatedData);

        if (validatedData.permission) {
            validatedData.permission_realm_id = validatedData.permission.realm_id;

            await permissionChecker.preCheck({
                name: validatedData.permission.name,
            });
        }

        if (validatedData.client) {
            validatedData.client_realm_id = validatedData.client.realm_id;
        }

        await permissionChecker.check({
            name: PermissionName.CLIENT_PERMISSION_CREATE,
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
                PermissionName.CLIENT_PERMISSION_CREATE,
                PermissionName.CLIENT_PERMISSION_DELETE,
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
        const paramId = useRequestParamID(req, {
            isUUID: false,
        });

        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.CLIENT_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionChecker.check({
            name: PermissionName.CLIENT_PERMISSION_DELETE,
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
