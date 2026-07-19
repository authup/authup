/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { pickRecord } from '@authup/kit';
import type { Permission, RolePermission } from '@authup/core-kit';
import type { IRoleRepository } from '../../../entities/index.ts';
import type { RoleProvisioningEntity } from '../../entities/role/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import { ProvisioningEntityResolver } from '../entity-resolver.ts';
import { ProvisioningJunctionSynchronizer } from '../junction-synchronizer.ts';
import type { RoleProvisioningSynchronizerContext } from './types.ts';

export class RoleProvisioningSynchronizer extends BaseProvisioningSynchronizer<RoleProvisioningEntity> {
    protected repository : IRoleRepository;

    protected permissionResolver : ProvisioningEntityResolver<Permission>;

    protected permissionJunction: ProvisioningJunctionSynchronizer<RolePermission>;

    constructor(ctx: RoleProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.permissionResolver = new ProvisioningEntityResolver(ctx.permissionRepository);
        this.permissionJunction = new ProvisioningJunctionSynchronizer({
            repository: ctx.rolePermissionRepository,
            ownerKey: 'roleId',
            ownerRealmKey: 'roleRealmId',
        });
    }

    async synchronize(input: RoleProvisioningEntity): Promise<RoleProvisioningEntity> {
        this.canonicalizeName(input.attributes);

        const strategy = normalizeEntityProvisioningStrategy(input.strategy);
        let attributes = await this.repository.findOneBy({
            name: input.attributes.name,
            realmId: input.attributes.realmId || null,
            clientId: input.attributes.clientId || null,
        });

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (attributes) {
                await this.repository.remove(attributes);
            }
            return {
                ...input,
                attributes: attributes || input.attributes,
            };
        }

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
        }

        if (!input.relations) {
            return {
                ...input,
                attributes,
            };
        }

        let globalPermissions = await this.permissionResolver.resolveGlobal(input.relations.globalPermissions);

        if (input.relations.globalPermissionsExclude && input.relations.globalPermissionsExclude.length > 0) {
            const excludeSet = new Set(input.relations.globalPermissionsExclude);
            globalPermissions = globalPermissions.filter((p) => !excludeSet.has(p.name));
        }

        const realmPermissions = attributes.realmId ?
            await this.permissionResolver.resolveRealm(input.relations.realmPermissions, attributes.realmId) :
            [];

        const permissions = [
            ...globalPermissions,
            ...realmPermissions,
        ];

        if (permissions.length > 0) {
            const defaultScope = input.relations.globalPermissionsRealmScope;

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

        return {
            ...input,
            attributes,
        };
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
