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
import type { PermissionProvisioningEntity } from '../../entities/permission';
import { ProvisioningEntityStrategyType, normalizeEntityProvisioningStrategy } from '../../strategy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { PermissionProvisioningSynchronizerContext } from './types.ts';

export class PermissionProvisioningSynchronizer extends BaseProvisioningSynchronizer<PermissionProvisioningEntity> {
    protected repository : IPermissionRepository;

    protected policyRepository?: IPolicyRepository;

    protected permissionPolicyRepository?: IPermissionPolicyRepository;

    constructor(ctx: PermissionProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.policyRepository = ctx.policyRepository;
        this.permissionPolicyRepository = ctx.permissionPolicyRepository;
    }

    async synchronize(input: PermissionProvisioningEntity): Promise<PermissionProvisioningEntity> {
        const strategy = normalizeEntityProvisioningStrategy(input.strategy);

        let attributes = await this.repository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || null,
            client_id: input.attributes.client_id || null,
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

        if (input.relations?.policies && input.relations.policies.length > 0) {
            await this.synchronizePolicies(attributes, input.relations.policies);
        }

        return {
            ...input,
            attributes,
        };
    }

    private async synchronizePolicies(permission: Permission, policyNames: string[]): Promise<void> {
        if (!this.policyRepository || !this.permissionPolicyRepository) {
            throw new Error(
                'Provisioning: policy/permissionPolicy repositories must be wired to attach policies to permissions.',
            );
        }

        for (const policyName of policyNames) {
            const policy = await this.policyRepository.findOneByName(policyName);
            if (!policy) {
                throw new Error(
                    `Provisioning: policy '${policyName}' not found for permission '${permission.name}'.`,
                );
            }

            const existing = await this.permissionPolicyRepository.findOneBy({
                permission_id: permission.id,
                policy_id: policy.id,
            });
            if (existing) {
                continue;
            }

            const entry = this.permissionPolicyRepository.create({
                permission_id: permission.id,
                permission_realm_id: permission.realm_id,
                policy_id: policy.id,
                policy_realm_id: policy.realm_id,
            });
            await this.permissionPolicyRepository.save(entry);
        }
    }
}
