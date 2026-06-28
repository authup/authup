/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PermissionError, PolicyData } from '@authup/access';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { PermissionName, RobotRoleValidator } from '@authup/core-kit';
import type { RobotRole } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { IRobotRoleRepository, IRobotRoleService } from './types.ts';

export type RobotRoleServiceContext = {
    repository: IRobotRoleRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class RobotRoleService extends JunctionEntityService implements IRobotRoleService {
    protected readonly ownerRealmKey = 'robot_realm_id';

    protected repository: IRobotRoleRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: RobotRoleValidator;

    constructor(ctx: RobotRoleServiceContext) {
        super();
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new RobotRoleValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<RobotRole>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
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
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.ROBOT_ROLE_READ,
                PermissionName.ROBOT_ROLE_UPDATE,
                PermissionName.ROBOT_ROLE_DELETE,
            ],
        });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<RobotRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_ROLE_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            role_id: validated.role_id,
            robot_id: validated.robot_id,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'robot-role' });
        }

        if (validated.role) {
            validated.role_realm_id = validated.role.realm_id;
        }

        if (validated.robot) {
            validated.robot_realm_id = validated.robot.realm_id;
        }

        if (validated.role && actor.identity) {
            const hasPermissions = await this.identityPermissionProvider.isSuperset(
                {
                    type: actor.identity.type,
                    id: actor.identity.data.id,
                },
                {
                    type: 'role',
                    id: validated.role_id,
                    clientId: validated.role.client_id,
                },
            );
            if (!hasPermissions) {
                throw new PermissionError({ message: 'You don\'t own the required permissions.' });
            }
        }

        // Stamp the owner (robot) realm so the realm_scope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_ROLE_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(validated),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(validated),
            }),
        });

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        return entity;
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<RobotRole> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROBOT_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Stamp the owner (robot) realm so the realm_scope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_ROLE_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(entity),
            }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
