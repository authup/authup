/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName } from '@authup/core-kit';
import type { RobotPermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { ActorContext } from '../actor/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IRobotPermissionRepository, IRobotPermissionService } from './types.ts';

export type RobotPermissionServiceContext = {
    repository: IRobotPermissionRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class RobotPermissionService extends AbstractEntityService implements IRobotPermissionService {
    protected repository: IRobotPermissionRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    constructor(ctx: RobotPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<RobotPermission>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.ROBOT_PERMISSION_CREATE,
                PermissionName.ROBOT_PERMISSION_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<RobotPermission> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.ROBOT_PERMISSION_CREATE,
                PermissionName.ROBOT_PERMISSION_DELETE,
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
    ): Promise<RobotPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_PERMISSION_CREATE });

        await this.repository.validateJoinColumns(data);

        if (data.permission) {
            data.permission_realm_id = data.permission.realm_id;

            await actor.permissionEvaluator.preEvaluate({
                name: data.permission.name,
            });
        }

        if (data.robot) {
            data.robot_realm_id = data.robot.realm_id;
        }

        if (
            data.permission &&
            actor.identity &&
            typeof data.policy_id === 'undefined'
        ) {
            const junctionPolicy = await this.identityPermissionProvider.resolveJunctionPolicy(
                { type: actor.identity.type, id: actor.identity.data.id },
                {
                    name: data.permission.name,
                    realm_id: data.permission.realm_id,
                    client_id: data.permission.client_id,
                },
            );
            if (junctionPolicy) {
                data.policy_id = junctionPolicy.id;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_PERMISSION_CREATE,
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
    ): Promise<RobotPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_PERMISSION_DELETE,
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
