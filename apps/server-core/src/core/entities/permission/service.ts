/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PolicyData, SystemPolicyName } from '@authup/access';
import { isPropertySet, isUUID } from '@authup/kit';
import { AuthupError } from '@authup/errors';
import { BadRequestError, NotFoundError } from '@ebec/http';
import {
    PermissionName,
    PermissionValidator,
    ROLE_ADMIN_NAME,
    ROLE_REALM_ADMIN_NAME,
    ValidatorGroup,
} from '@authup/core-kit';
import type { Permission } from '@authup/core-kit';
import type { ActorContext } from '../actor/types.ts';
import type { IPermissionPolicyRepository } from '../permission-policy/types.ts';
import type { IPolicyRepository } from '../policy/types.ts';
import type { IRealmRepository } from '../realm/types.ts';
import type { IRoleRepository } from '../role/types.ts';
import type { IRolePermissionRepository } from '../role-permission/types.ts';
import { AbstractEntityService } from '../service.ts';
import type { EntityRepositoryFindManyResult } from '../types.ts';
import type { IPermissionRepository, IPermissionService } from './types.ts';

const REALM_ADMIN_EXCLUDED_PERMISSIONS = [
    PermissionName.REALM_CREATE,
    PermissionName.REALM_UPDATE,
    PermissionName.REALM_DELETE,
];

/**
 * CUD permissions for global-capable entity types.
 * These get system.realm-bound to prevent realm_admin from
 * creating/modifying/deleting global entities.
 * All other permissions get system.realm-or-global.
 */
const REALM_ADMIN_BOUND_PERMISSIONS = [
    PermissionName.ROLE_CREATE,
    PermissionName.ROLE_UPDATE,
    PermissionName.ROLE_DELETE,
    PermissionName.PERMISSION_CREATE,
    PermissionName.PERMISSION_UPDATE,
    PermissionName.PERMISSION_DELETE,
    PermissionName.SCOPE_CREATE,
    PermissionName.SCOPE_UPDATE,
    PermissionName.SCOPE_DELETE,
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
            throw new NotFoundError();
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
    ): Promise<{ entity: Permission, created: boolean }> {
        let group: string;

        const realm = typeof data.realm_id === 'string' ?
            await this.realmRepository.resolve(data.realm_id) :
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
                where.realm_id = realm.id;
            }

            entity = await this.repository.findOneBy(where);
            if (!entity && options.updateOnly) {
                throw new NotFoundError();
            }
        } else if (options.updateOnly) {
            throw new NotFoundError();
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
                entity.built_in &&
                isPropertySet(validated, 'name') &&
                entity.name !== validated.name
            ) {
                throw new BadRequestError('The name of a built-in permission can not be changed.');
            }

            await actor.permissionEvaluator.evaluate({
                name: PermissionName.PERMISSION_UPDATE,
                input: new PolicyData({
                    [BuiltInPolicyType.ATTRIBUTES]: {
                        ...entity,
                        ...validated,
                    },
                }),
            });

            await this.repository.checkUniqueness(validated, entity);

            entity = this.repository.merge(entity, validated);

            await this.repository.save(entity);

            return { entity, created: false };
        }

        if (!isPropertySet(validated, 'realm_id') && actor.identity) {
            validated.realm_id = this.getActorRealmId(actor) || null;
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_CREATE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: validated,
            }),
        });

        await this.repository.checkUniqueness(validated);

        entity = this.repository.create(validated);
        entity = await this.repository.save(entity);

        await this.assignDefaultPolicy(entity);
        await this.assignToAdminRole(entity);
        await this.assignToRealmAdminRoles(entity);

        return { entity, created: true };
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<Permission> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.PERMISSION_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new NotFoundError();
        }

        if (entity.built_in) {
            throw new BadRequestError('A built-in permission can not be deleted.');
        }

        await actor.permissionEvaluator.evaluate({
            name: PermissionName.PERMISSION_DELETE,
            input: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: entity,
            }),
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

        const entry = this.permissionPolicyRepository.create({
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
            policy_id: defaultPolicy.id,
            policy_realm_id: defaultPolicy.realm_id,
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

        const entry = this.rolePermissionRepository.create({
            role_id: adminRole.id,
            role_realm_id: adminRole.realm_id,
            permission_id: permission.id,
            permission_realm_id: permission.realm_id,
        });
        await this.rolePermissionRepository.save(entry);
    }

    /**
     * Assign a newly created permission to all matching realm_admin roles.
     *
     * Uses differentiated junction policies:
     * - CUD on global-capable entity types → system.realm-bound
     * - Everything else → system.realm-or-global
     *
     * Eligible permissions:
     * - Built-in authup permissions (global) — assigned to all realm_admin roles
     * - Realm-scoped permissions — assigned to the realm_admin in the matching realm
     *
     * Excluded:
     * - Realm CRUD permissions (realm_create, realm_update, realm_delete)
     * - Custom global permissions (non-built-in with realm_id: null)
     *
     * Fails closed: skips assignment entirely if required policies are not found.
     */
    private async assignToRealmAdminRoles(permission: Permission): Promise<void> {
        if (REALM_ADMIN_EXCLUDED_PERMISSIONS.includes(permission.name as PermissionName)) {
            return;
        }

        const isBuiltIn = (Object.values(PermissionName) as string[]).includes(permission.name);
        if (!permission.realm_id && !isBuiltIn) {
            return;
        }

        const policyName = REALM_ADMIN_BOUND_PERMISSIONS.includes(permission.name as PermissionName) ?
            SystemPolicyName.REALM_BOUND :
            SystemPolicyName.REALM_OR_GLOBAL;

        const policy = await this.policyRepository.findOneByName(policyName);
        if (!policy) {
            return;
        }

        const realmAdminRoles = await this.roleRepository.findManyBy({
            name: ROLE_REALM_ADMIN_NAME,
        });

        for (const role of realmAdminRoles) {
            if (permission.realm_id && permission.realm_id !== role.realm_id) {
                continue;
            }

            const entry = this.rolePermissionRepository.create({
                role_id: role.id,
                role_realm_id: role.realm_id,
                permission_id: permission.id,
                permission_realm_id: permission.realm_id,
                policy_id: policy.id,
            });
            await this.rolePermissionRepository.save(entry);
        }
    }
}
