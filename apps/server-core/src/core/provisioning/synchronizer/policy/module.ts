/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { SystemPolicyName } from '@authup/access';
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

    async synchronizeMany(input: PolicyProvisioningEntity[]): Promise<PolicyProvisioningEntity[]> {
        const output = await super.synchronizeMany(input);
        // Prune stale TOP-LEVEL built-in system policies (e.g. a system policy removed
        // from the source). cleanupStaleChildren handles removed CHILDREN of a synced
        // parent; this is its top-level counterpart so the provisioner — not a migration
        // — owns the policy-graph shape. Realm-scoped (realmId != null) policies are out
        // of scope. Safe: the only caller passes the complete global top-level set.
        await this.cleanupStaleTopLevel(input.map((entity) => entity.attributes.name));
        return output;
    }

    async synchronize(input: PolicyProvisioningEntity): Promise<PolicyProvisioningEntity> {
        this.canonicalizeName(input.attributes);

        let entity = await this.repository.findOneBy({
            name: input.attributes.name,
            realmId: input.attributes.realmId || null,
        });

        if (entity) {
            // Only assign `invert` when the source declares it explicitly.
            // TypeORM's `merge` is a plain assign and would otherwise clobber
            // an existing flag with `undefined` (turning `invert: true` into
            // `null`/`false` on every reprovisioning pass).
            const mergeData: Partial<Policy> = {
                type: input.attributes.type,
                builtIn: input.attributes.builtIn,
                parentId: input.attributes.parentId,
                parent: input.attributes.parent,
            };
            if (typeof input.attributes.invert !== 'undefined') {
                mergeData.invert = input.attributes.invert;
            }
            entity = this.repository.merge(entity, mergeData);
            await this.repository.saveWithEA(entity, input.extraAttributes);
        } else {
            entity = this.repository.create(input.attributes);
            await this.repository.saveWithEA(entity, input.extraAttributes);
        }

        await this.synchronizeChildren(entity.id, input.children || []);

        return {
            ...input,
            attributes: entity,
        };
    }

    private async synchronizeChildren(
        parentId: string,
        children: PolicyProvisioningEntity[] = [],
    ): Promise<void> {
        await children.reduce(async (prev, child) => {
            await prev;
            child.attributes.parentId = parentId;
            child.attributes.parent = { id: parentId } as any;
            await this.synchronize(child);
        }, Promise.resolve());

        // derived AFTER synchronize() so the names are canonicalized —
        // a pre-sync snapshot would misidentify mixed-case children as stale
        const declaredNames = children.map((c) => c.attributes.name);

        await this.cleanupStaleChildren(parentId, declaredNames);
    }

    private async cleanupStaleChildren(
        parentId: string,
        declaredNames: (string | undefined)[],
    ): Promise<void> {
        const existingChildren = await this.repository.findManyBy({ parentId });

        const staleChildren = existingChildren.filter(
            (child) => !declaredNames.includes(child.name),
        );

        await staleChildren.reduce(async (prev, child) => {
            await prev;
            await this.cleanupStaleChild(child);
        }, Promise.resolve());
    }

    private async cleanupStaleTopLevel(declaredNames: (string | undefined)[]): Promise<void> {
        // Sentinel guard: only prune when the authoritative system source is present.
        // `system.default` is always declared by DefaultProvisioningSource; if it is
        // absent the caller passed a partial/non-system set (e.g. a file-only source via a
        // bare ProvisionerModule), so pruning would wrongly delete real system policies.
        if (!declaredNames.includes(SystemPolicyName.DEFAULT)) {
            return;
        }

        const existing = await this.repository.findManyBy({
            parentId: null,
            realmId: null,
            builtIn: true,
        });

        const stale = existing.filter((policy) => !declaredNames.includes(policy.name));

        await stale.reduce(async (prev, policy) => {
            await prev;
            await this.cleanupStaleChild(policy);
        }, Promise.resolve());
    }

    private async cleanupStaleChild(child: Policy): Promise<void> {
        const referencingJunctions = await this.permissionPolicyRepository.findManyBy({ policyId: child.id });

        if (referencingJunctions.length === 0) {
            await this.repository.deleteFromTree(child);
        } else {
            const detached = this.repository.merge(child, {
                parentId: null,
                parent: null,
                builtIn: false,
            });
            await this.repository.saveWithEA(detached);
        }
    }
}
