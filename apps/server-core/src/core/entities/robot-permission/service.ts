/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    PolicyData,
    RealmScope,
    minRealmScope,
} from '@authup/access';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { PermissionName, RobotPermissionValidator } from '@authup/core-kit';
import type { RobotPermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
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
                },
            );

            // CAP the grant's realm scope to the actor's own ceiling; default `own`.
            validated.realm_scope = minRealmScope(validated.realm_scope ?? RealmScope.OWN, grant.realmScope);

            // Only an unrestricted (`any`) actor may set policy_id explicitly.
            if (grant.realmScope !== RealmScope.ANY) {
                validated.policy_id = grant.policy ? grant.policy.id : null;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_PERMISSION_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { ...validated, realm_id: validated.robot_realm_id ?? null } }),
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

        let actorScope: RealmScope = RealmScope.ANY;
        if (actor.identity) {
            actorScope = RealmScope.OWN;
            const lookup: Record<string, any> = { permission_id: entity.permission_id };
            await this.repository.validateJoinColumns(lookup);
            if (lookup.permission) {
                const grant = await this.identityPermissionProvider.resolveJunctionGrant(
                    { type: actor.identity.type, id: actor.identity.data.id },
                    {
                        name: lookup.permission.name,
                        realmId: lookup.permission.realm_id,
                        clientId: lookup.permission.client_id,
                    },
                );
                actorScope = grant.realmScope as RealmScope;
            }
        }

        const updateData: Record<string, any> = {};

        // CAP to the actor's ceiling — a restricted actor may narrow but never widen.
        if (Object.prototype.hasOwnProperty.call(data, 'realm_scope')) {
            updateData.realm_scope = minRealmScope(data.realm_scope ?? RealmScope.OWN, actorScope);
        }

        if (
            Object.prototype.hasOwnProperty.call(data, 'policy_id') &&
            actorScope === RealmScope.ANY
        ) {
            updateData.policy_id = data.policy_id;
        }

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROBOT_PERMISSION_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { ...merged, realm_id: merged.robot_realm_id ?? null } }),
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
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { ...entity, realm_id: entity.robot_realm_id ?? null } }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
