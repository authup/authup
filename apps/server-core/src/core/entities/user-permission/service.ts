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

            // CAP the grant's realm reach to the actor's own ceiling (min relative scope
            // + intersection of the concrete realm allowlist); default `own`.
            const capped = realmReachCap(
                { scope: validated.realm_scope ?? RealmScope.OWN, realm_ids: validated.realm_ids },
                grant.realmReach,
            );
            validated.realm_scope = capped.scope;
            validated.realm_ids = capped.realm_ids ?? null;

            // Only an unrestricted (`any`) actor may set policy_id explicitly.
            if (grant.realmReach.scope !== RealmScope.ANY) {
                validated.policy_id = grant.policy ? grant.policy.id : null;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_PERMISSION_CREATE,
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
    ): Promise<UserPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.USER_PERMISSION_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

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

        if (
            Object.prototype.hasOwnProperty.call(data, 'policy_id') &&
            actorReach.scope === RealmScope.ANY
        ) {
            updateData.policy_id = data.policy_id;
        }

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.USER_PERMISSION_UPDATE,
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: merged }),
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
            input: new PolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }
}
