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
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { RoleAttribute } from '@authup/core-kit';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { IRoleAttributeRepository } from '../../../../../core/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { RoleAttributeRequestValidator } from './utils/index.ts';
import {
    RequestHandlerOperation,
    useRequestParamID,
    useRequestPermissionChecker,
} from '../../../request/index.ts';

export type RoleAttributeControllerContext = {
    repository: IRoleAttributeRepository,
};

@DTags('role')
@DController('/role-attributes')
export class RoleAttributeController {
    protected repository: IRoleAttributeRepository;

    constructor(ctx: RoleAttributeControllerContext) {
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
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
        });

        const { data: entities, meta } = await this.repository.findMany(useRequestQuery(req));

        const data: RoleAttribute[] = [];
        let { total } = meta;

        for (let i = 0; i < entities.length; i++) {
            try {
                await permissionChecker.checkOneOf({
                    name: [
                        PermissionName.ROLE_READ,
                        PermissionName.ROLE_UPDATE,
                        PermissionName.ROLE_DELETE,
                    ],
                    input: new PolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: entities[i],
                    }),
                });
                data.push(entities[i]);
            } catch (e) {
                total--;
            }
        }

        return send(res, {
            data,
            meta: {
                ...meta,
                total,
            },
        });
    }

    @DPost('', [ForceLoggedInMiddleware])
    async add(
        @DBody() user: NonNullable<RoleAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.ROLE_UPDATE });

        const validator = new RoleAttributeRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            group: RequestHandlerOperation.CREATE,
        });

        await this.repository.validateJoinColumns(data);

        data.realm_id = data.role.realm_id;

        const entity = this.repository.create(data);

        await permissionChecker.check({
            name: PermissionName.ROLE_UPDATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        await this.repository.save(entity);

        return sendCreated(res, entity);
    }

    @DGet('/:id', [ForceLoggedInMiddleware])
    async get(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheckOneOf({
            name: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
        });

        const paramId = useRequestParamID(req);

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionChecker.checkOneOf({
            name: [
                PermissionName.ROLE_READ,
                PermissionName.ROLE_UPDATE,
                PermissionName.ROLE_DELETE,
            ],
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        return send(res, entity);
    }

    @DPost('/:id', [ForceLoggedInMiddleware])
    async edit(
        @DPath('id') id: string,
            @DBody() user: NonNullable<RoleAttribute>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.ROLE_UPDATE });

        const paramId = useRequestParamID(req);

        const validator = new RoleAttributeRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            group: RequestHandlerOperation.UPDATE,
        });

        await this.repository.validateJoinColumns(data);

        let entity = await this.repository.findOneBy({ id: paramId });
        if (!entity) {
            throw new NotFoundError();
        }

        entity = this.repository.merge(entity, data);

        await permissionChecker.check({
            name: PermissionName.ROLE_UPDATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        await this.repository.save(entity);

        return sendAccepted(res, entity);
    }

    @DDelete('/:id', [ForceLoggedInMiddleware])
    async drop(
        @DPath('id') id: string,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.ROLE_UPDATE });

        const paramId = useRequestParamID(req);

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionChecker.check({
            name: PermissionName.ROLE_UPDATE,
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
