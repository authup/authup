/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPolicyRepository } from '../../../entities/index.ts';
import type { PolicyProvisioningEntity } from '../../entities/policy/index.ts';
import { BaseProvisioningSynchronizer } from '../base.ts';
import type { PolicyProvisioningSynchronizerContext } from './types.ts';

export class PolicyProvisioningSynchronizer extends BaseProvisioningSynchronizer<PolicyProvisioningEntity> {
    protected repository: IPolicyRepository;

    constructor(ctx: PolicyProvisioningSynchronizerContext) {
        super();

        this.repository = ctx.repository;
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
            await this.repository.saveWithEA(entity, input.ea);
        } else {
            entity = this.repository.create(input.attributes);
            await this.repository.saveWithEA(entity, input.ea);
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
        await children.reduce(async (prev, child) => {
            await prev;
            child.attributes.parent_id = parentId;
            child.attributes.parent = { id: parentId } as any;
            await this.synchronize(child);
        }, Promise.resolve());
    }
}
