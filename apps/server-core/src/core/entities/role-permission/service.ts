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
import { ValidatorGroup, hasOwnProperty } from '@authup/kit';
import {
    PermissionName,
    RolePermissionValidator,
} from '@authup/core-kit';
import type { Permission, RolePermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IRolePermissionRepository, IRolePermissionService } from './types.ts';

export type RolePermissionServiceContext = {
    repository: IRolePermissionRepository;
    permissionRepository: IEntityRepository<Permission>;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class RolePermissionService extends JunctionEntityService implements IRolePermissionService {
    protected readonly ownerRealmKey = 'role_realm_id';

    protected repository: IRolePermissionRepository;

    protected permissionRepository: IEntityRepository<Permission>;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: RolePermissionValidator;

    constructor(ctx: RolePermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.permissionRepository = ctx.permissionRepository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new RolePermissionValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<RolePermission>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.ROLE_PERMISSION_DELETE,
                PermissionName.ROLE_PERMISSION_READ,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<RolePermission> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.ROLE_PERMISSION_DELETE,
                PermissionName.ROLE_PERMISSION_READ,
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
    ): Promise<RolePermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_PERMISSION_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            role_id: validated.role_id,
            permission_id: validated.permission_id,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'role-permission' });
        }

        if (validated.permission) {
            validated.permission_realm_id = validated.permission.realm_id;

            // Q4: the superset gate runs uniformly — no ROLE_ADMIN_NAME bypass.
            await actor.permissionEvaluator.preEvaluate({
                name: validated.permission.name,
                realmId: validated.permission.realm_id,
                clientId: validated.permission.client_id,
            });
        }

        if (validated.role) {
            validated.role_realm_id = validated.role.realm_id;
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

            // CAP the grant's realm scope to the actor's own ceiling (a creator may not
            // grant broader than it holds); default to the most restrictive `own`.
            validated.realm_scope = minRealmScope(validated.realm_scope ?? RealmScope.OWN, grant.realmScope);

            // Only an unrestricted (`any`) actor may set policy_id explicitly; a
            // restricted actor silently inherits its own grant's policy (cannot
            // attach an unowned policy nor detach to widen).
            if (grant.realmScope !== RealmScope.ANY || grant.policy) {
                validated.policy_id = grant.policy ? grant.policy.id : null;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_PERMISSION_CREATE,
            // Stamp the owner (role) realm as the canonical `realm_id` so the realm_scope
            // factor gates this junction write against the actor's reach (no cross-realm).
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(validated) }),
        });

        let entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        return entity;
    }

    async update(
        id: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<RolePermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_PERMISSION_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Resolve the actor's ceiling for this junction's permission (the existing
        // entity only carries scalar FKs — load the permission relation to derive it).
        // No actor identity (system context) is not realm-gated here; the operation is
        // still authorized by the evaluate() below.
        let actorScope: RealmScope = RealmScope.ANY;
        let actorPolicyFree = true;
        let actorPolicyId: string | null = null;
        if (actor.identity) {
            actorScope = RealmScope.OWN;
            const permission = await this.permissionRepository.findOneById(entity.permission_id);
            if (permission) {
                const grant = await this.identityPermissionProvider.resolveJunctionGrant(
                    { type: actor.identity.type, id: actor.identity.data.id },
                    {
                        name: permission.name,
                        realmId: permission.realm_id,
                        clientId: permission.client_id,
                    },
                );
                actorScope = grant.realmScope as RealmScope;
                actorPolicyFree = !grant.policy;
                actorPolicyId = grant.policy ? grant.policy.id : null;
            }
        }

        const updateData: Record<string, any> = {};

        // CAP to the actor's ceiling — a restricted actor may narrow but never widen.
        if (hasOwnProperty(data, 'realm_scope')) {
            updateData.realm_scope = minRealmScope(data.realm_scope as RealmScope, actorScope);
        }

        // policy_id, capped to the actor's ceiling (mirrors create-time inheritance):
        // an unrestricted actor may set/clear it explicitly; a restricted/policy-bound
        // actor that touches the binding inherits its own grant's policy and cannot
        // detach or replace it to persist a binding broader than it holds.
        if (actorScope === RealmScope.ANY && actorPolicyFree) {
            if (hasOwnProperty(data, 'policy_id')) {
                updateData.policy_id = data.policy_id;
            }
        } else if (hasOwnProperty(data, 'realm_scope') || hasOwnProperty(data, 'policy_id')) {
            updateData.policy_id = actorPolicyId;
        }

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_PERMISSION_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(merged) }),
        });

        return this.repository.save(merged);
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<RolePermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_PERMISSION_DELETE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity) }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
