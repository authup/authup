/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PermissionError, definePolicyInput } from '@authup/access';
import { BadRequestError, EntityConflictError, EntityNotFoundError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { IdentityProviderRoleMappingValidator, PermissionName } from '@authup/core-kit';
import type { IdentityProviderRoleMapping } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult  } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { IIdentityProviderRoleMappingRepository, IIdentityProviderRoleMappingService } from './types.ts';

export type IdentityProviderRoleMappingServiceContext = {
    repository: IIdentityProviderRoleMappingRepository;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class IdentityProviderRoleMappingService extends JunctionEntityService implements IIdentityProviderRoleMappingService {
    protected readonly ownerRealmKey = 'provider_realm_id';

    protected repository: IIdentityProviderRoleMappingRepository;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: IdentityProviderRoleMappingValidator;

    constructor(ctx: IdentityProviderRoleMappingServiceContext) {
        super();
        this.repository = ctx.repository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new IdentityProviderRoleMappingValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<IdentityProviderRoleMapping>> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.IDENTITY_PROVIDER_ROLE_READ,
                PermissionName.IDENTITY_PROVIDER_READ,
                PermissionName.IDENTITY_PROVIDER_UPDATE,
                PermissionName.IDENTITY_PROVIDER_DELETE,
            ],
        });

        return this.repository.findMany(query);
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<IdentityProviderRoleMapping> {
        await actor.permissionEvaluator.preEvaluateOneOf({
            name: [
                PermissionName.IDENTITY_PROVIDER_ROLE_READ,
                PermissionName.IDENTITY_PROVIDER_READ,
                PermissionName.IDENTITY_PROVIDER_UPDATE,
                PermissionName.IDENTITY_PROVIDER_DELETE,
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
    ): Promise<IdentityProviderRoleMapping> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ROLE_CREATE });

        const validated = await this.validator.run(data, { group: ValidatorGroup.CREATE });

        await this.repository.validateJoinColumns(validated);

        const existing = await this.repository.findOneBy({
            provider_id: validated.provider_id,
            role_id: validated.role_id,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'identity-provider-role-mapping' });
        }

        if (validated.provider) {
            validated.provider_realm_id = validated.provider.realm_id;
        }

        if (validated.role) {
            validated.role_realm_id = validated.role.realm_id;
        }

        if (
            validated.role_realm_id &&
            validated.provider_realm_id &&
            validated.role_realm_id !== validated.provider_realm_id
        ) {
            throw new BadRequestError('It is not possible to map an identity provider to a role of another realm.');
        }

        if (validated.role && actor.identity) {
            const hasPermissions = await this.identityPermissionProvider.isSuperset(
                {
                    type: actor.identity.type,
                    id: actor.identity.data.id,
                },
                {
                    type: 'role',
                    id: validated.role_id,
                    clientId: validated.role.client_id,
                },
            );
            if (!hasPermissions) {
                throw new PermissionError({ message: 'You don\'t own the required permissions.' });
            }
        }

        // Stamp the owner (identity-provider) realm so the realm_scope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_ROLE_CREATE,
            data: definePolicyInput({
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
    ): Promise<IdentityProviderRoleMapping> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        await this.repository.validateJoinColumns(validated);

        const merged = this.repository.merge(entity, validated);

        // Stamp the owner (identity-provider) realm so the realm_scope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE,
            data: definePolicyInput({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(merged),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(merged),
            }),
        });

        return this.repository.save(merged);
    }

    async delete(
        id: string,
        actor: ActorContext,
    ): Promise<IdentityProviderRoleMapping> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ROLE_DELETE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        // Stamp the owner (identity-provider) realm so the realm_scope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_ROLE_DELETE,
            data: definePolicyInput({
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
