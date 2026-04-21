/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData } from '@authup/access';
import { NotFoundError } from '@ebec/http';
import { PermissionName, RobotPermissionValidator, ValidatorGroup } from '@authup/core-kit';
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

    protected validator: RobotPermissionValidator;

    constructor(ctx: RobotPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new RobotPermissionValidator();
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

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        if (validated.permission) {
            validated.permission_realm_id = validated.permission.realm_id;

            await actor.permissionEvaluator.preEvaluate({
                name: validated.permission.name,
                realmId: validated.permission.realm_id,
                clientId: validated.permission.client_id,
            });
        }

        if (validated.robot) {
            validated.robot_realm_id = validated.robot.realm_id;
        }

        if (
            validated.permission &&
            actor.identity &&
            typeof validated.policy_id === 'undefined'
        ) {
            const junctionPolicy = await this.identityPermissionProvider.resolveJunctionPolicy(
                {
                    type: actor.identity.type,
                    id: actor.identity.data.id,
                },
                {
                    name: validated.permission.name,
                    realmId: validated.permission.realm_id,
                    clientId: validated.permission.client_id,
                },
            );
            if (junctionPolicy) {
                validated.policy_id = junctionPolicy.id;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_PERMISSION_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated }),
        });

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        return entity;
    }

    async update(
        id: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<RobotPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_PERMISSION_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        const updateData: Record<string, any> = {};
        if (Object.prototype.hasOwnProperty.call(data, 'policy_id')) {
            updateData.policy_id = data.policy_id;
        }

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_PERMISSION_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: merged }),
        });

        return this.repository.save(merged);
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
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
