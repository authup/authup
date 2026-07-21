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
import {
    PermissionName,
    RolePermissionValidator,
} from '@authup/core-kit';
import type { Permission, RolePermission } from '@authup/core-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import { applyJunctionCreateGrant, buildJunctionUpdateData } from '../../identity/permission/junction-grant.ts';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IRolePermissionRepository, IRolePermissionService } from './types.ts';
import { decodeQuery } from '../../query/index.ts';
import { rolePermissionSchema } from './schema.ts';

export type RolePermissionServiceContext = {
    repository: IRolePermissionRepository;
    permissionRepository: IEntityRepository<Permission>;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class RolePermissionService extends JunctionEntityService implements IRolePermissionService {
    protected readonly ownerRealmKey = 'roleRealmId';

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

        return this.repository.findMany(await decodeQuery(query, { schema: rolePermissionSchema, actor }));
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
            roleId: validated.roleId,
            permissionId: validated.permissionId,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'role-permission' });
        }

        if (validated.permission) {
            validated.permissionRealmId = validated.permission.realmId;

            // Q4: the superset gate runs uniformly — no ROLE_ADMIN_NAME bypass.
            await actor.permissionEvaluator.preEvaluate({
                name: validated.permission.name,
                realmId: validated.permission.realmId,
                clientId: validated.permission.clientId,
            });
        }

        if (validated.role) {
            validated.roleRealmId = validated.role.realmId;
        }

        if (validated.permission && actor.identity) {
            const grant = await this.identityPermissionProvider.resolveJunctionGrant(
                {
                    type: actor.identity.type,
                    id: actor.identity.data.id,
                },
                {
                    name: validated.permission.name,
                    realmId: validated.permission.realmId,
                    clientId: validated.permission.clientId,
                    realmScope: validated.realmScope ?? RealmScope.OWN,
                },
            );

            applyJunctionCreateGrant(validated, grant);
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_PERMISSION_CREATE,
            // Stamp the owner (role) realm as the canonical `realmId` so the realmScope
            // factor gates this junction write against the actor's reach (no cross-realm).
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
    ): Promise<RolePermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_PERMISSION_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        // Resolve the actor's grant for this junction's permission (the existing entity only
        // carries scalar FKs — load the permission relation to derive it).
        const permission = await this.permissionRepository.findOneById(entity.permissionId);
        if (permission) {
            // Member-permission gate: an actor may only modify a binding for a permission it
            // holds (mirrors create()).
            await actor.permissionEvaluator.preEvaluate({
                name: permission.name,
                realmId: permission.realmId,
                clientId: permission.clientId,
            });
        }

        // No actor identity (system context) is not realm-gated here; the operation is still
        // authorized by the evaluate() below.
        let actorScope: `${RealmScope}` = RealmScope.ANY;
        let actorPolicyFree = true;
        let actorPolicyId: string | null = null;
        if (actor.identity && permission) {
            const grant = await this.identityPermissionProvider.resolveJunctionGrant(
                { type: actor.identity.type, id: actor.identity.data.id },
                {
                    name: permission.name,
                    realmId: permission.realmId,
                    clientId: permission.clientId,
                    realmScope: validated.realmScope ?? entity.realmScope,
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
            existingScope: entity.realmScope,
            actorScope,
            actorPolicyFree,
            actorPolicyId,
        });

        await this.repository.validateJoinColumns(updateData);

        const merged = this.repository.merge(entity, updateData);

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_PERMISSION_UPDATE,
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
    ): Promise<RolePermission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.ROLE_PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.ROLE_PERMISSION_DELETE,
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
