/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { AuthupError } from '@authup/errors';
import { pickRecord } from '@authup/kit';
import type { Permission, Role, RolePermission } from '@authup/core-kit';
import type { IClientRepository, IRoleRepository } from '../../../entities/index.ts';
import type { RoleProvisioningEntity, RoleProvisioningRelations } from '../../entities/role/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import type { ProvisioningSynchronizeContext } from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import { buildOwnedEntityLookup, needsOwningClientRealm } from '../owner.ts';
import { ProvisioningEntityResolver } from '../entity-resolver.ts';
import { ProvisioningJunctionSynchronizer } from '../junction-synchronizer.ts';
import type { RoleProvisioningSynchronizerContext } from './types.ts';

export class RoleProvisioningSynchronizer extends BaseProvisioningSynchronizer<RoleProvisioningEntity> {
    protected repository : IRoleRepository;

    protected clientRepository?: IClientRepository;

    protected permissionResolver : ProvisioningEntityResolver<Permission>;

    protected permissionJunction: ProvisioningJunctionSynchronizer<RolePermission>;

    constructor(ctx: RoleProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.clientRepository = ctx.clientRepository;
        this.permissionResolver = new ProvisioningEntityResolver(ctx.permissionRepository);
        this.permissionJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.rolePermissionRepository,
            ownerKey: 'roleId',
            ownerRealmKey: 'roleRealmId',
        });
    }

    async synchronize(
        input: RoleProvisioningEntity,
        context?: ProvisioningSynchronizeContext,
    ): Promise<RoleProvisioningEntity> {
        this.canonicalizeName(input.attributes);

        const strategy = normalizeEntityProvisioningStrategy(input.strategy);
        let attributes = await this.repository.findOneBy(buildOwnedEntityLookup(input.attributes));

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (attributes) {
                await this.repository.remove(attributes);
            }

            return {
                ...input,
                attributes: attributes || input.attributes,
            };
        }

        let created = false;

        if (attributes) {
            switch (strategy.type) {
                case ProvisioningEntityStrategyType.MERGE:
                    attributes = this.repository.merge(
                        attributes,
                        strategy.attributes ?
                            pickRecord(input.attributes, strategy.attributes) :
                            input.attributes,
                    );

                    attributes = await this.repository.save(attributes);

                    break;
                case ProvisioningEntityStrategyType.REPLACE:
                    input.attributes.id = attributes.id;
                    attributes = await this.repository.save(this.repository.create(input.attributes));

                    break;
            }
        } else {
            attributes = await this.repository.save(this.repository.create(input.attributes));
            created = true;
        }

        if (needsOwningClientRealm(attributes, input.attributes)) {
            attributes.realmId = input.attributes.realmId as string;
            attributes = await this.repository.save(attributes);
        }

        // createOnly leaves a row it did not create alone, its permission
        // bindings included, unless the row is built in: only provisioning
        // writes one, so its bindings are the file's to extend.
        const bindRelations = created ||
            !!attributes.builtIn ||
            strategy.type !== ProvisioningEntityStrategyType.CREATE_ONLY;

        if (bindRelations && input.relations) {
            const role = attributes;
            const { relations } = input;

            await this.bind(() => this.synchronizeRelations(role, input, relations), context);
        }

        return {
            ...input,
            attributes,
        };
    }

    protected async synchronizeRelations(
        attributes: Role,
        input: RoleProvisioningEntity,
        relations: RoleProvisioningRelations,
    ): Promise<void> {
        let globalPermissions = await this.permissionResolver.resolveGlobal(relations.globalPermissions);

        if (relations.globalPermissionsExclude && relations.globalPermissionsExclude.length > 0) {
            const excludeSet = new Set(relations.globalPermissionsExclude);

            globalPermissions = globalPermissions.filter((p) => !excludeSet.has(p.name));
        }

        const realmPermissions = attributes.realmId ?
            await this.permissionResolver.resolveRealm(relations.realmPermissions, attributes.realmId) :
            [];

        const permissions = [
            ...globalPermissions,
            ...realmPermissions,
        ];

        if (permissions.length > 0) {
            const defaultScope = relations.globalPermissionsRealmScope;

            if (defaultScope) {
                const overrides = this.buildRealmScopeOverrides(input);

                for (const permission of permissions) {
                    const realmScope = overrides.get(permission.name) ?? defaultScope;

                    await this.permissionJunction.synchronize(
                        attributes,
                        [permission],
                        'permissionId',
                        'permissionRealmId',
                        { realmScope },
                    );
                }
            } else {
                await this.permissionJunction.synchronize(
                    attributes,
                    permissions,
                    'permissionId',
                    'permissionRealmId',
                );
            }
        }

        // Permissions owned by any client of the role's realm, bound at the
        // junction's default reach.
        if (!relations.clientPermissions || !attributes.realmId) {
            return;
        }

        if (!this.clientRepository) {
            throw new AuthupError('A role client permission relation needs the client repository, which is not wired here.');
        }

        const clientPermissions = await this.permissionResolver.resolveClientOwned(
            relations.clientPermissions,
            attributes.realmId,
            this.clientRepository,
        );

        if (clientPermissions.length > 0) {
            await this.permissionJunction.synchronize(
                attributes,
                clientPermissions,
                'permissionId',
                'permissionRealmId',
            );
        }
    }

    private buildRealmScopeOverrides(input: RoleProvisioningEntity): Map<string, string> {
        const overrides = new Map<string, string>();

        if (input.relations?.globalPermissionsRealmScopeOverrides) {
            for (const [realmScope, permissionNames] of Object.entries(input.relations.globalPermissionsRealmScopeOverrides)) {
                if (!permissionNames) {
                    continue;
                }

                for (const permName of permissionNames) {
                    overrides.set(permName, realmScope);
                }
            }
        }

        return overrides;
    }
}
