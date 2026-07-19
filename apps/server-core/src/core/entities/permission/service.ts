/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { 
    BuiltInPolicyType, 
    RealmScope, 
    SystemPolicyName, 
    definePolicyData, 
} from '@authup/access';
import { ValidatorGroup, isPropertySet, isUUID } from '@authup/kit';
import { AuthupError, EntityNotFoundError, ValidationError } from '@authup/errors';
import {
    PermissionName,
    PermissionValidator,
    ROLE_ADMIN_NAME,
    ROLE_REALM_ADMIN_NAME,
} from '@authup/core-kit';
import type { Permission } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import type { IPermissionPolicyRepository } from '../permission-policy/types.ts';
import type { IPolicyRepository } from '../policy/types.ts';
import type { IRealmRepository } from '../realm/types.ts';
import type { IRoleRepository } from '../role/types.ts';
import type { IRolePermissionRepository } from '../role-permission/types.ts';
import { AbstractEntityService } from '@authup/server-kit';
import type { IPermissionRepository, IPermissionService } from './types.ts';

const REALM_ADMIN_EXCLUDED_PERMISSIONS = [
    PermissionName.REALM_CREATE,
    PermissionName.REALM_UPDATE,
    PermissionName.REALM_DELETE,
];

/**
 * Direct-entity CUD permissions that realm_admin grants at `realmScope: own`
 * (strictly the actor's own realm — see line 372). Every other realm_admin
 * permission defaults to `ownOrNull` (own realm OR global/null resources) so it
 * can act on global building blocks.
 *
 * Junction CUD (e.g. user_role, role_permission) is intentionally NOT listed here:
 * it stays `ownOrNull` because a junction can legitimately reference a global
 * side (realmId: null) — a strict `own` would reject those.
 */
const REALM_ADMIN_BOUND_PERMISSIONS = [
    PermissionName.CLIENT_CREATE,
    PermissionName.CLIENT_UPDATE,
    PermissionName.CLIENT_DELETE,
    PermissionName.IDENTITY_PROVIDER_CREATE,
    PermissionName.IDENTITY_PROVIDER_UPDATE,
    PermissionName.IDENTITY_PROVIDER_DELETE,
    PermissionName.PERMISSION_CREATE,
    PermissionName.PERMISSION_UPDATE,
    PermissionName.PERMISSION_DELETE,
    PermissionName.ROLE_CREATE,
    PermissionName.ROLE_UPDATE,
    PermissionName.ROLE_DELETE,
    PermissionName.SCOPE_CREATE,
    PermissionName.SCOPE_UPDATE,
    PermissionName.SCOPE_DELETE,
    PermissionName.USER_CREATE,
    PermissionName.USER_UPDATE,
    PermissionName.USER_DELETE,
];

export type PermissionServiceContext = {
    repository: IPermissionRepository;
    realmRepository: IRealmRepository;
    roleRepository: IRoleRepository;
    rolePermissionRepository: IRolePermissionRepository;
    policyRepository: IPolicyRepository;
    permissionPolicyRepository: IPermissionPolicyRepository;
};

export class PermissionService extends AbstractEntityService implements IPermissionService {
    protected repository: IPermissionRepository;

    protected realmRepository: IRealmRepository;

    protected roleRepository: IRoleRepository;

    protected rolePermissionRepository: IRolePermissionRepository;

    protected policyRepository: IPolicyRepository;

    protected permissionPolicyRepository: IPermissionPolicyRepository;

    protected validator: PermissionValidator;

    constructor(ctx: PermissionServiceContext) {
        super();
        this.repository = ctx.repository;
        this.realmRepository = ctx.realmRepository;
        this.roleRepository = ctx.roleRepository;
        this.rolePermissionRepository = ctx.rolePermissionRepository;
        this.policyRepository = ctx.policyRepository;
        this.permissionPolicyRepository = ctx.permissionPolicyRepository;
        this.validator = new PermissionValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<Permission>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        idOrName: string,
        actor: ActorContext,
        realm?: string,
    ): Promise<Permission> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.PERMISSION_READ,
                PermissionName.PERMISSION_UPDATE,
                PermissionName.PERMISSION_DELETE,
            ],
        });

        const entity = await this.repository.findOneByIdOrName(idOrName, realm);
        if (!entity) {
            throw new EntityNotFoundError();
        }

        return entity;
    }

    async create(
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Permission> {
        const { entity } = await this.save(undefined, data, actor);
        return entity;
    }

    async update(
        idOrName: string,
        data: Record<string, any>,
        actor: ActorContext,
    ): Promise<Permission> {
        const { entity } = await this.save(idOrName, data, actor, { updateOnly: true });
        return entity;
    }

    async save(
        idOrName: string | undefined,
        data: Record<string, any>,
        actor: ActorContext,
        options: { updateOnly?: boolean } = {},
    ): Promise<{
        entity: Permission,
        created: boolean
    }> {
        let group: string;

        const realm = typeof data.realmId === 'string' ?
            await this.realmRepository.resolve(data.realmId) :
            undefined;

        let entity: Permission | null | undefined;
        if (idOrName) {
            const where: Record<string, any> = {};
            if (isUUID(idOrName)) {
                where.id = idOrName;
            } else {
                where.name = idOrName;
            }

            if (realm) {
                where.realmId = realm.id;
            }

            entity = await this.repository.findOneBy(where);
            if (!entity && options.updateOnly) {
                throw new EntityNotFoundError();
            }
        } else if (options.updateOnly) {
            throw new EntityNotFoundError();
        }

        if (entity) {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_UPDATE });
            group = ValidatorGroup.UPDATE;
        } else {
            await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_CREATE });
            group = ValidatorGroup.CREATE;
        }

        const validated = await this.validator.run(data, { group });

        await this.repository.validateJoinColumns(validated);

        if (entity) {
            if (
                entity.builtIn &&
                isPropertySet(validated, 'name') &&
                entity.name !== validated.name
            ) {
                throw new ValidationError('The name of a built-in permission can not be changed.');
            }

            await actor.permissionEvaluator.evaluate({
                name: PermissionName.PERMISSION_UPDATE,
                data: definePolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...validated,
                    },
                    [BuiltInPolicyType.REALM_MATCH]: validated.realmId ?? entity.realmId ?? null,
                }),
            });

            await this.repository.checkUniqueness(validated, entity);

            entity = this.repository.merge(entity, validated);

            await this.repository.save(entity);

            return {
                entity,
                created: false,
            };
        }

        if (!isPropertySet(validated, 'realmId') && actor.identity) {
            validated.realmId = this.getActorRealmId(actor) || null;
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_CREATE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: validated, ...this.resourceRealmMatch(validated) }),
        });

        await this.repository.checkUniqueness(validated);

        entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        await this.assignDefaultPolicy(entity);
        await this.assignToAdminRole(entity);
        await this.assignToRealmAdminRoles(entity);

        return {
            entity,
            created: true,
        };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Permission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        if (entity.builtIn) {
            throw new ValidationError('A built-in permission can not be deleted.');
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_DELETE,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: entity, ...this.resourceRealmMatch(entity) }),
        });

        const { id: entityId } = entity;
        await this.repository.remove(entity);
        entity.id = entityId;

        return entity;
    }

    /**
     * Assign the system.default policy to a newly created permission.
     * This ensures all permissions are evaluated with the baseline security
     * policy (identity, permission-binding, realm-match) by default.
     */
    private async assignDefaultPolicy(permission: Permission): Promise<void> {
        const defaultPolicy = await this.policyRepository.findOneByName(SystemPolicyName.DEFAULT);
        if (!defaultPolicy) {
            throw new AuthupError(`The ${SystemPolicyName.DEFAULT} policy is not provisioned. Cannot create permissions without the default security policy.`);
        }

        const existing = await this.permissionPolicyRepository.findOneBy({
            permissionId: permission.id,
            policyId: defaultPolicy.id,
        });
        if (existing) {
            return;
        }

        const entry = this.permissionPolicyRepository.create({
            permissionId: permission.id,
            permissionRealmId: permission.realmId,
            policyId: defaultPolicy.id,
            policyRealmId: defaultPolicy.realmId,
        });
        await this.permissionPolicyRepository.save(entry);
    }

    /**
     * Assign a newly created permission to the global admin role.
     * The admin role receives every permission without policy restrictions.
     */
    private async assignToAdminRole(permission: Permission): Promise<void> {
        const adminRole = await this.roleRepository.findOneByName(ROLE_ADMIN_NAME);
        if (!adminRole) {
            return;
        }

        const existing = await this.rolePermissionRepository.findOneBy({
            roleId: adminRole.id,
            permissionId: permission.id,
        });
        if (existing) {
            return;
        }

        const entry = this.rolePermissionRepository.create({
            roleId: adminRole.id,
            roleRealmId: adminRole.realmId,
            permissionId: permission.id,
            permissionRealmId: permission.realmId,
            // Global admin: unrestricted realm reach.
            realmScope: RealmScope.ANY,
        });
        await this.rolePermissionRepository.save(entry);
    }

    /**
     * Assign a newly created permission to all matching realm_admin roles.
     *
     * Uses differentiated realmScope on the junction:
     * - CUD on global-capable entity types → own (strictly own realm)
     * - Everything else → ownOrNull (own realm + null/global resources)
     *
     * Eligible permissions:
     * - Built-in authup permissions (global) — assigned to all realm_admin roles
     * - Realm-scoped permissions — assigned to the realm_admin in the matching realm
     *
     * Excluded:
     * - Realm CRUD permissions (realm_create, realm_update, realm_delete)
     * - Custom global permissions (non-built-in with realmId: null)
     */
    private async assignToRealmAdminRoles(permission: Permission): Promise<void> {
        if (REALM_ADMIN_EXCLUDED_PERMISSIONS.includes(permission.name as PermissionName)) {
            return;
        }

        const isBuiltIn = (Object.values(PermissionName) as string[]).includes(permission.name);
        if (!permission.realmId && !isBuiltIn) {
            return;
        }

        const realmScope = REALM_ADMIN_BOUND_PERMISSIONS.includes(permission.name as PermissionName) ?
            RealmScope.OWN :
            RealmScope.OWN_OR_NULL;

        const realmAdminRoles = await this.roleRepository.findManyBy({ name: ROLE_REALM_ADMIN_NAME });

        for (const role of realmAdminRoles) {
            if (permission.realmId && permission.realmId !== role.realmId) {
                continue;
            }

            const existing = await this.rolePermissionRepository.findOneBy({
                roleId: role.id,
                permissionId: permission.id,
            });
            if (existing) {
                continue;
            }

            const entry = this.rolePermissionRepository.create({
                roleId: role.id,
                roleRealmId: role.realmId,
                permissionId: permission.id,
                permissionRealmId: permission.realmId,
                realmScope,
            });
            await this.rolePermissionRepository.save(entry);
        }
    }
}
