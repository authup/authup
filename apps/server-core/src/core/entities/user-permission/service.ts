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
    minRealmScope, 
} from '@authup/access';
import { EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup, hasOwnProperty } from '@authup/kit';
import { PermissionName, UserPermissionValidator } from '@authup/core-kit';
import type { Permission, UserPermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IUserPermissionRepository, IUserPermissionService } from './types.ts';

export type UserPermissionServiceContext = {
    repository: IUserPermissionRepository;
    permissionRepository: IEntityRepository<Permission>;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class UserPermissionService extends JunctionEntityService implements IUserPermissionService {
    protected readonly ownerRealmKey = 'user_realm_id';

    protected repository: IUserPermissionRepository;

    protected permissionRepository: IEntityRepository<Permission>;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: UserPermissionValidator;

    constructor(ctx: UserPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.permissionRepository = ctx.permissionRepository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new UserPermissionValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<UserPermission>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_PERMISSION_CREATE,
                PermissionName.USER_PERMISSION_DELETE,
                PermissionName.USER_PERMISSION_READ,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<UserPermission> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.USER_PERMISSION_CREATE,
                PermissionName.USER_PERMISSION_DELETE,
                PermissionName.USER_PERMISSION_READ,
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
    ): Promise<UserPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_PERMISSION_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            permission_id: validated.permission_id,
            user_id: validated.user_id,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'user-permission' });
        }

        if (validated.permission) {
            validated.permission_realm_id = validated.permission.realm_id;

            await actor.permissionEvaluator.preEvaluate({
                name: validated.permission.name,
                realmId: validated.permission.realm_id,
                clientId: validated.permission.client_id,
            });
        }

        if (validated.user) {
            validated.user_realm_id = validated.user.realm_id;
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

            // CAP the grant's realm scope to the actor's own ceiling; default `own`.
            validated.realm_scope = minRealmScope([validated.realm_scope ?? RealmScope.OWN, grant.realmScope]);

            // Only an unrestricted (`any`) actor may set policy_id explicitly.
            if (grant.realmScope !== RealmScope.ANY || grant.policy) {
                validated.policy_id = grant.policy ? grant.policy.id : null;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_PERMISSION_CREATE,
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
    ): Promise<UserPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_PERMISSION_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

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
                        realmScope: data.realm_scope ?? entity.realm_scope,
                    },
                );
                actorScope = grant.realmScope as RealmScope;
                actorPolicyFree = !grant.policy;
                actorPolicyId = grant.policy ? grant.policy.id : null;
            }
        }

        const updateData: Record<string, any> = {};

        const touchesScope = hasOwnProperty(data, 'realm_scope');
        const touchesPolicy = hasOwnProperty(data, 'policy_id');

        // CAP to the actor's ceiling — a restricted actor may narrow but never widen.
        if (touchesScope) {
            updateData.realm_scope = minRealmScope([data.realm_scope as RealmScope, actorScope]);
        }

        // policy_id, capped to the actor's ceiling (mirrors create-time inheritance):
        // an unrestricted actor may set/clear it explicitly; a restricted/policy-bound
        // actor that touches the binding inherits its own grant's policy and cannot
        // detach or replace it to persist a binding broader than it holds.
        if (actorScope === RealmScope.ANY && actorPolicyFree) {
            if (touchesPolicy) {
                updateData.policy_id = data.policy_id;
            }
        } else if (touchesScope || touchesPolicy) {
            updateData.policy_id = actorPolicyId;

            // Re-cap the EXISTING reach when the update omits realm_scope: a restricted actor
            // mutating the binding (e.g. a policy-only edit) must not leave a wider pre-existing
            // realm_scope standing — that would persist a binding broader than any grant it
            // holds (fail-OPEN otherwise).
            if (!touchesScope) {
                updateData.realm_scope = minRealmScope([entity.realm_scope as RealmScope, actorScope]);
            }
        }

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_PERMISSION_UPDATE,
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
    ): Promise<UserPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_PERMISSION_DELETE,
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
