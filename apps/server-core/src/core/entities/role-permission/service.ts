/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { RealmReach } from '@authup/access';
import {
    BuiltInPolicyType,
    PolicyData,
    RealmScope,
    realmReachCap,
} from '@authup/access';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import {
    PermissionName,
    RolePermissionValidator,
} from '@authup/core-kit';
import type { RolePermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { IRolePermissionRepository, IRolePermissionService } from './types.ts';

export type RolePermissionServiceContext = {
    repository: IRolePermissionRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class RolePermissionService extends AbstractEntityService implements IRolePermissionService {
    protected repository: IRolePermissionRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: RolePermissionValidator;

    constructor(ctx: RolePermissionServiceContext) {
        super();
        this.repository = ctx.repository;
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

            // CAP the grant's realm reach to the actor's own ceiling (a creator may
            // not grant broader than it holds): min relative scope + intersection of
            // the concrete realm allowlist; default to the most restrictive `own`.
            const capped = realmReachCap(
                { scope: validated.realm_scope ?? RealmScope.OWN, realm_ids: validated.realm_ids },
                grant.realmReach,
            );
            validated.realm_scope = capped.scope;
            validated.realm_ids = capped.realm_ids ?? null;

            // Only an unrestricted (`any`) actor may set policy_id explicitly; a
            // restricted actor silently inherits its own grant's policy (cannot
            // attach an unowned policy nor detach to widen).
            if (grant.realmReach.scope !== RealmScope.ANY) {
                validated.policy_id = grant.policy ? grant.policy.id : null;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_PERMISSION_CREATE,
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
        let actorReach: RealmReach = { scope: RealmScope.ANY };
        if (actor.identity) {
            actorReach = { scope: RealmScope.OWN };
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
                actorReach = grant.realmReach;
            }
        }

        const updateData: Record<string, any> = {};

        const wantsScope = Object.prototype.hasOwnProperty.call(data, 'realm_scope');
        const wantsIds = Object.prototype.hasOwnProperty.call(data, 'realm_ids');
        if (wantsScope || wantsIds) {
            // CAP to the actor's ceiling — a restricted actor may narrow but never widen.
            const capped = realmReachCap(
                {
                    scope: wantsScope ? (data.realm_scope ?? RealmScope.OWN) : (entity.realm_scope ?? RealmScope.OWN),
                    realm_ids: wantsIds ? data.realm_ids : entity.realm_ids,
                },
                actorReach,
            );
            // Persist the capped reach atomically — capping one dimension can narrow
            // the other, so write both whenever the caller touches either.
            updateData.realm_scope = capped.scope;
            updateData.realm_ids = capped.realm_ids ?? null;
        }

        // Only an unrestricted (`any`) actor may change policy_id (incl. detaching to
        // null); a restricted actor's policy_id change is silently ignored.
        if (
            Object.prototype.hasOwnProperty.call(data, 'policy_id') &&
            actorReach.scope === RealmScope.ANY
        ) {
            updateData.policy_id = data.policy_id;
        }

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_PERMISSION_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: merged }),
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
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
