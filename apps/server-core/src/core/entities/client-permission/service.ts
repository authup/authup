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
import { ClientPermissionValidator, PermissionName } from '@authup/core-kit';
import type { ClientPermission, Permission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IClientPermissionRepository, IClientPermissionService } from './types.ts';

export type ClientPermissionServiceContext = {
    repository: IClientPermissionRepository;
    permissionRepository: IEntityRepository<Permission>;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class ClientPermissionService extends JunctionEntityService implements IClientPermissionService {
    protected readonly ownerRealmKey = 'client_realm_id';

    protected repository: IClientPermissionRepository;

    protected permissionRepository: IEntityRepository<Permission>;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: ClientPermissionValidator;

    constructor(ctx: ClientPermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.permissionRepository = ctx.permissionRepository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new ClientPermissionValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<ClientPermission>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.CLIENT_PERMISSION_CREATE,
                PermissionName.CLIENT_PERMISSION_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.CLIENT_PERMISSION_CREATE,
                PermissionName.CLIENT_PERMISSION_DELETE,
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
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_PERMISSION_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            client_id: validated.client_id,
            permission_id: validated.permission_id,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'client-permission' });
        }

        if (validated.permission) {
            validated.permission_realm_id = validated.permission.realm_id;

            await actor.permissionEvaluator.preEvaluate({
                name: validated.permission.name,
                realmId: validated.permission.realm_id,
                clientId: validated.permission.client_id,
            });
        }

        if (validated.client) {
            validated.client_realm_id = validated.client.realm_id;
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
            validated.realm_scope = minRealmScope([validated.realm_scope ?? RealmScope.OWN, grant.realmScope]);

            // Only an unrestricted (`any`) actor may set policy_id explicitly.
            if (grant.realmScope !== RealmScope.ANY || grant.policy) {
                validated.policy_id = grant.policy ? grant.policy.id : null;
            }
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_PERMISSION_CREATE,
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
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_PERMISSION_UPDATE });

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
            updateData.realm_scope = minRealmScope([data.realm_scope as RealmScope, actorScope]);
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
            name: PermissionName.CLIENT_PERMISSION_UPDATE,
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
    ): Promise<ClientPermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.CLIENT_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.CLIENT_PERMISSION_DELETE,
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
