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
import type { RobotRole } from '@authup/core-kit';
import { send, sendAccepted, sendCreated } from 'routup';
import { useRequestQuery } from '@routup/basic/query';
import { RoutupContainerAdapter } from '@validup/adapter-routup';
import type { IRobotRoleRepository } from '../../../../../core/index.ts';
import type { IdentityPermissionService } from '../../../../../services/index.ts';
import { ForceLoggedInMiddleware } from '../../../middleware/index.ts';
import { RobotRoleRequestValidator } from './utils/index.ts';
import {
    RequestHandlerOperation,
    useRequestIdentityOrFail,
    useRequestParamID,
    useRequestPermissionChecker,
} from '../../../request/index.ts';

export type RobotRoleControllerContext = {
    repository: IRobotRoleRepository,
    identityPermissionService: IdentityPermissionService,
};

@DTags('robot')
@DController('/robot-roles')
export class RobotRoleController {
    protected repository: IRobotRoleRepository;

    protected identityPermissionService: IdentityPermissionService;

    constructor(ctx: RobotRoleControllerContext) {
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
                PermissionName.ROBOT_ROLE_READ,
                PermissionName.ROBOT_ROLE_UPDATE,
                PermissionName.ROBOT_ROLE_DELETE,
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
        @DBody() body: Pick<RobotRole, 'role_id' | 'robot_id'>,
            @DRequest() req: any,
            @DResponse() res: any,
    ): Promise<any> {
        const permissionChecker = useRequestPermissionChecker(req);
        await permissionChecker.preCheck({ name: PermissionName.ROBOT_ROLE_CREATE });

        const validator = new RobotRoleRequestValidator();
        const validatorAdapter = new RoutupContainerAdapter(validator);
        const data = await validatorAdapter.run(req, {
            group: RequestHandlerOperation.CREATE,
        });

        await this.repository.validateJoinColumns(data);

        const policyData = new PolicyData();
        policyData.set<Partial<RobotRole>>(BuiltInPolicyType.ATTRIBUTES, data);

        if (data.role) {
            data.role_realm_id = data.role.realm_id;

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

        if (data.robot) {
            data.robot_realm_id = data.robot.realm_id;
        }

        await permissionChecker.check({
            name: PermissionName.ROBOT_ROLE_CREATE,
            input: policyData,
        });

        let entity = this.repository.create(data);
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
                PermissionName.ROBOT_ROLE_READ,
                PermissionName.ROBOT_ROLE_UPDATE,
                PermissionName.ROBOT_ROLE_DELETE,
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
        await permissionChecker.preCheck({ name: PermissionName.ROBOT_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id: paramId });

        if (!entity) {
            throw new NotFoundError();
        }

        await permissionChecker.check({
            name: PermissionName.ROBOT_ROLE_DELETE,
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
