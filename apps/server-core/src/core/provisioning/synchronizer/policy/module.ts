/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Policy } from '@authup/core-kit';
import type { IPermissionPolicyRepository } from '../../../entities/permission-policy/types.ts';
import type { IPolicyRepository } from '../../../entities/index.ts';
import type { PolicyProvisioningEntity } from '../../entities/policy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { PolicyProvisioningSynchronizerContext } from './types.ts';

export class PolicyProvisioningSynchronizer extends BaseProvisioningSynchronizer<PolicyProvisioningEntity> {
    protected repository: IPolicyRepository;

    protected permissionPolicyRepository: IPermissionPolicyRepository;

    constructor(ctx: PolicyProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
        this.permissionPolicyRepository = ctx.permissionPolicyRepository;
    }

    async synchronize(input: PolicyProvisioningEntity): Promise<PolicyProvisioningEntity> {
        let entity = await this.repository.findOneBy({
            name: input.attributes.name,
            realm_id: input.attributes.realm_id || null,
        });

        if (entity) {
            entity = this.repository.merge(entity, {
                type: input.attributes.type,
                built_in: input.attributes.built_in,
                parent_id: input.attributes.parent_id,
                parent: input.attributes.parent,
            });
            await this.repository.saveWithEA(entity, input.extraAttributes);
        } else {
            entity = this.repository.create(input.attributes);
            await this.repository.saveWithEA(entity, input.extraAttributes);
        }

        if (input.children && input.children.length > 0) {
            await this.synchronizeChildren(entity.id, input.children);
        }

        return {
            ...input,
            attributes: entity,
        };
    }

    private async synchronizeChildren(
        parentId: string,
        children: PolicyProvisioningEntity[],
    ): Promise<void> {
        const declaredNames = children.map((c) => c.attributes.name);

        await children.reduce(async (prev, child) => {
            await prev;
            child.attributes.parent_id = parentId;
            child.attributes.parent = { id: parentId } as any;
            await this.synchronize(child);
        }, Promise.resolve());

        await this.cleanupStaleChildren(parentId, declaredNames);
    }

    private async cleanupStaleChildren(
        parentId: string,
        declaredNames: (string | undefined)[],
    ): Promise<void> {
        const existingChildren = await this.repository.findManyBy({
            parent_id: parentId,
        });

        const staleChildren = existingChildren.filter(
            (child) => !declaredNames.includes(child.name),
        );

        await staleChildren.reduce(async (prev, child) => {
            await prev;
            await this.cleanupStaleChild(child);
        }, Promise.resolve());
    }

    private async cleanupStaleChild(child: Policy): Promise<void> {
        const referencingJunctions = await this.permissionPolicyRepository.findManyBy({
            policy_id: child.id,
        });

        if (referencingJunctions.length === 0) {
            await this.repository.deleteFromTree(child);
        } else {
            const detached = this.repository.merge(child, {
                parent_id: null,
                parent: null,
                built_in: false,
            });
            await this.repository.saveWithEA(detached);
        }
    }
}
