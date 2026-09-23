/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { BuiltInPolicyType, PermissionError, definePolicyData } from '@authup/access';
import { inArray } from '@rapiq/core';
import { EntityConflictError, EntityNotFoundError, ValidationError } from '@authup/errors';
import { ValidatorGroup } from '@authup/kit';
import { IdentityProviderRoleMappingValidator, PermissionName } from '@authup/core-kit';
import type { IdentityProviderRoleMapping, Role } from '@authup/core-kit';
import type { ActorContext, EntityRepositoryFindManyResult, IEntityRepository } from '@authup/server-kit';
import { JunctionEntityService } from '@authup/server-kit';
import type { IIdentityPermissionProvider } from '../../identity/permission/types.ts';
import type { IIdentityProviderRoleMappingRepository, IIdentityProviderRoleMappingService } from './types.ts';
import { appendQueryConditions, decodeQuery } from '../../query/index.ts';
import { identityProviderRoleMappingSchema } from './schema.ts';

const READ_PERMISSION_NAMES = [
    PermissionName.IDENTITY_PROVIDER_ROLE_READ,
    PermissionName.IDENTITY_PROVIDER_READ,
    PermissionName.IDENTITY_PROVIDER_UPDATE,
    PermissionName.IDENTITY_PROVIDER_DELETE,
];

export type IdentityProviderRoleMappingServiceContext = {
    repository: IIdentityProviderRoleMappingRepository;
    roleRepository: IEntityRepository<Role>;
    identityPermissionProvider: IIdentityPermissionProvider;
};

export class IdentityProviderRoleMappingService extends JunctionEntityService implements IIdentityProviderRoleMappingService {
    protected readonly ownerRealmKey = 'providerRealmId';

    protected repository: IIdentityProviderRoleMappingRepository;

    protected roleRepository: IEntityRepository<Role>;

    protected identityPermissionProvider: IIdentityPermissionProvider;

    protected validator: IdentityProviderRoleMappingValidator;

    constructor(ctx: IdentityProviderRoleMappingServiceContext) {
        super();
        this.repository = ctx.repository;
        this.roleRepository = ctx.roleRepository;
        this.identityPermissionProvider = ctx.identityPermissionProvider;
        this.validator = new IdentityProviderRoleMappingValidator();
    }

    async getMany(
        query: Record<string, any>,
        actor: ActorContext,
    ): Promise<EntityRepositoryFindManyResult<IdentityProviderRoleMapping>> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        let parsed = await decodeQuery(query, { schema: identityProviderRoleMappingSchema, actor });

        // The realm reach of the grant, compiled into a row condition and lowered onto
        // the OWNER realm key — a junction row carries no `realmId` (issue #3594).
        const compiled = await actor.permissionEvaluator.compile({
            name: READ_PERMISSION_NAMES,
            realmAttributeName: this.ownerRealmKey,
        });
        if (compiled.verdict === 'deny') {
            parsed = appendQueryConditions(parsed, inArray('id', []));
        } else if (compiled.verdict === 'conditional') {
            parsed = appendQueryConditions(parsed, compiled.condition);
        }

        const { data: entities, meta } = await this.repository.findMany(parsed);

        if (compiled.verdict !== 'post') {
            return { data: entities, meta };
        }

        const data: IdentityProviderRoleMapping[] = [];
        let { total } = meta;

        for (const entity of entities) {
            try {
                await actor.permissionEvaluator.evaluateOneOf({
                    name: READ_PERMISSION_NAMES,
                    data: definePolicyData({
                        [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity),
                        [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(entity),
                    }),
                });
                data.push(entity);
            } catch {
                total -= 1;
            }
        }

        return { data, meta: { ...meta, total } };
    }

    async getOne(
        id: string,
        actor: ActorContext,
    ): Promise<IdentityProviderRoleMapping> {
        await actor.permissionEvaluator.preEvaluateOneOf({ name: READ_PERMISSION_NAMES });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        await actor.permissionEvaluator.evaluateOneOf({
            name: READ_PERMISSION_NAMES,
            data: definePolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: this.junctionAttributes(entity),
                [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(entity),
            }),
        });

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
            providerId: validated.providerId,
            roleId: validated.roleId,
        });
        if (existing) {
            throw new EntityConflictError({ entity: 'identity-provider-role-mapping' });
        }

        if (validated.provider) {
            validated.providerRealmId = validated.provider.realmId;
        }

        if (validated.role) {
            validated.roleRealmId = validated.role.realmId;
        }

        if (
            validated.roleRealmId &&
            validated.providerRealmId &&
            validated.roleRealmId !== validated.providerRealmId
        ) {
            throw new ValidationError('It is not possible to map an identity provider to a role of another realm.');
        }

        if (validated.role && actor.identity) {
            const hasPermissions = await this.identityPermissionProvider.isSuperset(
                await this.getActorGrants(actor),
                await this.identityPermissionProvider.getFor({
                    type: 'role',
                    id: validated.roleId,
                }),
            );
            if (!hasPermissions) {
                throw new PermissionError({ message: 'You don\'t own the required permissions.' });
            }
        }

        // Stamp the owner (identity-provider) realm so the realmScope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_ROLE_CREATE,
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
    ): Promise<IdentityProviderRoleMapping> {
        await actor.permissionEvaluator.preEvaluate({ name: PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE });

        const entity = await this.repository.findOneBy({ id });
        if (!entity) {
            throw new EntityNotFoundError();
        }

        const validated = await this.validator.run(data, { group: ValidatorGroup.UPDATE });

        await this.repository.validateJoinColumns(validated);

        // `roleId` is immutable on update (CREATE-group only in the validator), so the conferred
        // role never changes here — only the attribute-matching criteria do. Still re-verify the
        // actor OWNS that role before letting it edit (e.g. broaden) the mapping, mirroring create()
        // and the permission-junction member gate (#3164): you may not modify a role-conferring
        // mapping for a role you no longer own.
        const role = await this.roleRepository.findOneById(entity.roleId);
        if (role && actor.identity) {
            const hasPermissions = await this.identityPermissionProvider.isSuperset(
                await this.getActorGrants(actor),
                await this.identityPermissionProvider.getFor({
                    type: 'role',
                    id: role.id,
                }),
            );
            if (!hasPermissions) {
                throw new PermissionError({ message: 'You don\'t own the required permissions.' });
            }
        }

        const current = this.junctionAttributes(entity);
        const merged = this.repository.merge(entity, validated);

        // Stamp the owner (identity-provider) realm so the realmScope factor gates cross-realm writes.
        await this.evaluateUpdate(
            actor,
            PermissionName.IDENTITY_PROVIDER_ROLE_UPDATE,
            current,
            this.junctionAttributes(merged),
            { [BuiltInPolicyType.REALM_MATCH]: this.junctionResourceRealm(merged) },
        );

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

        // Stamp the owner (identity-provider) realm so the realmScope factor gates cross-realm writes.
        await actor.permissionEvaluator.evaluate({
            name: PermissionName.IDENTITY_PROVIDER_ROLE_DELETE,
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
