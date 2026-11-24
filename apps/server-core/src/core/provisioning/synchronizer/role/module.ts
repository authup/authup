/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { ValidationError } from '@authup/errors';
import { pickRecord } from '@authup/kit';
import type { Permission, Role, RolePermission } from '@authup/core-kit';
import type { IClientRepository, IPolicyRepository, IRoleRepository } from '../../../entities/index.ts';
import type { RoleProvisioningEntity, RoleProvisioningRelations } from '../../entities/role/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import type { IProvisioningRealmRepairer, ProvisioningSynchronizeContext } from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import { findOwnedEntity } from '../owner.ts';
import { ProvisioningEntityResolver } from '../entity-resolver.ts';
import { ProvisioningJunctionSynchronizer } from '../junction-synchronizer.ts';
import type { RoleProvisioningSynchronizerContext } from './types.ts';

export class RoleProvisioningSynchronizer extends BaseProvisioningSynchronizer<RoleProvisioningEntity> {
    protected repository : IRoleRepository;

    protected realmRepairer?: IProvisioningRealmRepairer;

    protected clientRepository: IClientRepository;

    protected policyRepository: IPolicyRepository;

    protected permissionResolver : ProvisioningEntityResolver<Permission>;

    protected permissionJunction: ProvisioningJunctionSynchronizer<RolePermission>;

    constructor(ctx: RoleProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.realmRepairer = ctx.realmRepairer;
        this.clientRepository = ctx.clientRepository;
        this.policyRepository = ctx.policyRepository;
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
        const lookup = await findOwnedEntity(this.repository, input.attributes);
        let attributes = lookup.entity;

        if (
            attributes &&
            lookup.realmless &&
            strategy.type !== ProvisioningEntityStrategyType.ABSENT
        ) {
            attributes = await this.repairRealm(attributes, input.attributes.realmId as string);
        }

        if (strategy.type === ProvisioningEntityStrategyType.ABSENT) {
            if (attributes) {
                await this.repository.remove(attributes);
            }

            return {
                ...input,
                attributes: attributes || input.attributes,
            };
        }

        // createOnly leaves a row it did not create alone, its permission
        // bindings included, unless the row is built in: only provisioning
        // writes one, so its bindings are the file's to extend.
        const bindRelations = !attributes ||
            !!attributes.builtIn ||
            strategy.type !== ProvisioningEntityStrategyType.CREATE_ONLY;

        // resolved before any write: a role saved ahead of a failed lookup
        // would be skipped by the next createOnly pass, its bindings lost
        const policyId = bindRelations && input.relations ?
            await this.resolvePolicyId(input.relations) :
            undefined;


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

        if (bindRelations && input.relations) {
            const role = attributes;
            const { relations } = input;

            await this.bind(() => this.synchronizeRelations(role, input, relations, policyId), context);
        }

        return {
            ...input,
            attributes,
        };
    }

    protected async resolvePolicyId(relations: RoleProvisioningRelations): Promise<string | undefined> {
        if (!relations.globalPermissionsPolicy) {
            return undefined;
        }

        const policy = await this.policyRepository.findOneBy({
            name: relations.globalPermissionsPolicy,
            realmId: null,
        });

        if (!policy) {
            throw new ValidationError(`The global policy ${relations.globalPermissionsPolicy} does not exist.`);
        }

        return policy.id;
    }

    protected async synchronizeRelations(
        attributes: Role,
        input: RoleProvisioningEntity,
        relations: RoleProvisioningRelations,
        policyId?: string,
    ): Promise<void> {
        let globalPermissions = await this.permissionResolver.resolveGlobal(relations.globalPermissions);

        if (relations.globalPermissionsExclude && relations.globalPermissionsExclude.length > 0) {
            const excludeSet = new Set(relations.globalPermissionsExclude);

            globalPermissions = globalPermissions.filter((p) => !excludeSet.has(p.name));
        }

        const realmPermissions = attributes.realmId ?
            await this.permissionResolver.resolveRealm(relations.realmPermissions, attributes.realmId) :
            [];

        const defaultScope = relations.globalPermissionsRealmScope;
        const overrides = this.buildRealmScopeOverrides(input);

        const bind = async (permissions: Permission[], bindPolicy: boolean) => {
            for (const permission of permissions) {
                const extra: Record<string, unknown> = {};

                if (defaultScope) {
                    extra.realmScope = overrides.get(permission.name) ?? defaultScope;
                }

                if (bindPolicy && policyId) {
                    extra.policyId = policyId;
                }

                await this.permissionJunction.synchronize(
                    attributes,
                    [permission],
                    'permissionId',
                    'permissionRealmId',
                    extra,
                );
            }
        };

        await bind(globalPermissions, true);
        await bind(realmPermissions, false);

        // Permissions owned by any client of the role's realm, bound at the
        // junction's default reach.
        if (!relations.clientPermissions || !attributes.realmId) {
            return;
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

    /**
     * The rows referring to the role take the realm first, so an
     * interrupted repair is found again on the next boot.
     */
    protected async repairRealm(entity: Role, realmId: string): Promise<Role> {
        if (this.realmRepairer) {
            await this.realmRepairer.repairRole(entity.id, realmId);
        }

        entity.realmId = realmId;

        return this.repository.save(entity);
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
