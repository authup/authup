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
import { PermissionName, UserPermissionValidator } from '@authup/core-kit';
import type { UserPermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { AbstractEntityService } from '@authup/server-kit';
import type { IUserPermissionRepository, IUserPermissionService } from './types.ts';

export type UserPermissionServiceContext = {
    repository: IUserPermissionRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class UserPermissionService extends AbstractEntityService implements IUserPermissionService {
    protected repository: IUserPermissionRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: UserPermissionValidator;

    constructor(ctx: UserPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
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
            name: PermissionName.USER_PERMISSION_CREATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { ...validated, realm_id: validated.user_realm_id ?? null } }),
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
            name: PermissionName.USER_PERMISSION_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { ...merged, realm_id: merged.user_realm_id ?? null } }),
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
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { ...entity, realm_id: entity.user_realm_id ?? null } }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
