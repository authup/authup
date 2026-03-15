/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { RobotRole } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IRobotRoleRepository, IRobotRoleService } from './types.ts';

export type RobotRoleServiceContext = {
    repository: IRobotRoleRepository;
};

export class RobotRoleService extends AbstractEntityService implements IRobotRoleService {
    protected repository: IRobotRoleRepository;

    constructor(ctx: RobotRoleServiceContext) {
        super();
        this.repository = ctx.repository;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<RobotRole>> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.ROBOT_ROLE_READ,
                PermissionName.ROBOT_ROLE_UPDATE,
                PermissionName.ROBOT_ROLE_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<RobotRole> {
        await actor.permissionChecker.preCheckOneOf({
            name: [
                PermissionName.ROBOT_ROLE_READ,
                PermissionName.ROBOT_ROLE_UPDATE,
                PermissionName.ROBOT_ROLE_DELETE,
            ],
        });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<RobotRole> {
        await actor.permissionChecker.preCheck({ name: PermissionName.ROBOT_ROLE_CREATE });

        await this.repository.validateJoinColumns(data);

        if (data.role) {
            data.role_realm_id = data.role.realm_id;
        }

        if (data.robot) {
            data.robot_realm_id = data.robot.realm_id;
        }

        await actor.permissionChecker.check({
            name: PermissionName.ROBOT_ROLE_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: data,
            }),
        });

        let entity = this.repository.create(data);
        entity = await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<RobotRole> {
        await actor.permissionChecker.preCheck({ name: PermissionName.ROBOT_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionChecker.check({
            name: PermissionName.ROBOT_ROLE_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
