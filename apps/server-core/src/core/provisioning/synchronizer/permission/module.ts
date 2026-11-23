/*
 * Copyright (c) 2026-2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { pickRecord } from '@authup/kit';
import type { Permission } from '@authup/core-kit';
import type { IPermissionPolicyRepository } from '../../../entities/permission-policy/types.ts';
import type { IPermissionRepository, IPolicyRepository } from '../../../entities/index.ts';
import type { PermissionProvisioningEntity } from '../../entities/permission/index.ts';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import type { IProvisioningRealmRepairer } from '../../types.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import { findOwnedEntity } from '../owner.ts';
import type { PermissionProvisioningSynchronizerContext } from './types.ts';

export class PermissionProvisioningSynchronizer extends BaseProvisioningSynchronizer<PermissionProvisioningEntity> {
    protected repository : IPermissionRepository;

    protected realmRepairer?: IProvisioningRealmRepairer;

    protected policyRepository?: IPolicyRepository;

    protected permissionPolicyRepository?: IPermissionPolicyRepository;

    constructor(ctx: PermissionProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.realmRepairer = ctx.realmRepairer;
        this.policyRepository = ctx.policyRepository;
        this.permissionPolicyRepository = ctx.permissionPolicyRepository;
    }

    async synchronize(input: PermissionProvisioningEntity): Promise<PermissionProvisioningEntity> {
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

        if (input.relations?.policies && input.relations.policies.length > 0) {
            await this.synchronizePolicies(attributes, input.relations.policies);
        }

        return {
            ...input,
            attributes,
        };
    }

    /**
     * The rows referring to the permission take the realm first, so an
     * interrupted repair is found again on the next boot.
     */
    protected async repairRealm(entity: Permission, realmId: string): Promise<Permission> {
        if (this.realmRepairer) {
            await this.realmRepairer.repairPermission(entity.id, realmId);
        }

        entity.realmId = realmId;

        return this.repository.save(entity);
    }

    private async synchronizePolicies(permission: Permission, policyNames: string[]): Promise<void> {
        if (!this.policyRepository || !this.permissionPolicyRepository) {
            throw new Error(
                'Provisioning: policy/permissionPolicy repositories must be wired to attach policies to permissions.',
            );
        }

        for (const policyName of policyNames) {
            const policy = await this.policyRepository.findOneByName(policyName.trim().toLowerCase());

            if (!policy) {
                throw new Error(
                    `Provisioning: policy '${policyName}' not found for permission '${permission.name}'.`,
                );
            }

            const existing = await this.permissionPolicyRepository.findOneBy({
                permissionId: permission.id,
                policyId: policy.id,
            });

            if (existing) {
                continue;
            }

            const entry = this.permissionPolicyRepository.create({
                permissionId: permission.id,
                permissionRealmId: permission.realmId,
                policyId: policy.id,
                policyRealmId: policy.realmId,
            });

            await this.permissionPolicyRepository.save(entry);
        }
    }
}
