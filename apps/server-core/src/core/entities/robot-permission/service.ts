/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    RealmScope,
    definePolicyData,
} from '@authup/access';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { PermissionName, RobotPermissionValidator } from '@authup/core-kit';
import type { Permission, RobotPermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import { applyJunctionCreateGrant, buildJunctionUpdateData } from '../../identity/permission/junction-grant.ts';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IRobotPermissionRepository, IRobotPermissionService } from './types.ts';

export type RobotPermissionServiceContext = {
    repository: IRobotPermissionRepository;
    permissionRepository: IEntityRepository<Permission>;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class RobotPermissionService extends JunctionEntityService implements IRobotPermissionService {
    protected readonly ownerRealmKey = 'robot_realm_id';

    protected repository: IRobotPermissionRepository;

    protected permissionRepository: IEntityRepository<Permission>;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: RobotPermissionValidator;

    constructor(ctx: RobotPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.permissionRepository = ctx.permissionRepository;
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
            throw new EntityNotFoundError();
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

        const existing = await this.repository.findOneBy({
            permission_id: validated.permission_id,
            robot_id: validated.robot_id,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'robot-permission' });
        }

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

        if (validated.permission && actor.identity) {
            const grant = await this.identityPermissionProvider.resolveJunctionGrant(
                {
                    type: actor.identity.type,
                    id: actor.identity.data.id,
                },
                {
                    name: validated.permission.name,
                    realmId: validated.permission.realm_id,
                    clientId: validated.permission.client_id,
                    realmScope: validated.realm_scope ?? RealmScope.OWN,
                },
            );

            applyJunctionCreateGrant(validated, grant);
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_PERMISSION_CREATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(validated),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(validated),
            }),
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
            throw new EntityNotFoundError();
        }

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        const permission = await this.permissionRepository.findOneById(entity.permission_id);
        if (permission) {
            // Member-permission gate: an actor may only modify a binding for a permission it
            // holds (mirrors create()).
            await actor.permissionEvaluator.preEvaluate({
                name: permission.name,
                realmId: permission.realm_id,
                clientId: permission.client_id,
            });
        }

        let actorScope: `${RealmScope}` = RealmScope.ANY;
        let actorPolicyFree = true;
        let actorPolicyId: string | null = null;
        if (actor.identity && permission) {
            const grant = await this.identityPermissionProvider.resolveJunctionGrant(
                { type: actor.identity.type, id: actor.identity.data.id },
                {
                    name: permission.name,
                    realmId: permission.realm_id,
                    clientId: permission.client_id,
                    realmScope: validated.realm_scope ?? entity.realm_scope,
                },
            );
            actorScope = grant.realmScope;
            actorPolicyFree = !grant.policy;
            actorPolicyId = grant.policy ? grant.policy.id : null;
        } else if (actor.identity) {
            actorScope = RealmScope.OWN;
        }

        const updateData = buildJunctionUpdateData({
            data: validated,
            existingScope: entity.realm_scope,
            actorScope,
            actorPolicyFree,
            actorPolicyId,
        });

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_PERMISSION_UPDATE,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(merged),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(merged),
            }),
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
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_PERMISSION_DELETE,
            data: definePolicyData({
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
