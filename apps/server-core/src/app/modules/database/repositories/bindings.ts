/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    EntityManager,
    EntityTarget,
    FindOptionsRelations,
    FindOptionsWhere,
    ObjectLiteral,
} from 'typeorm';
import type { BasePolicy, PermissionPolicyBinding } from '@authup/access';
import { buildRedisKeyPath } from '@authup/server-kit';
import { PolicyRepository } from '../../../../adapters/database/domains/policy/index.ts';

export type LoadBoundPermissionsOptions<E extends ObjectLiteral> = {
    manager: EntityManager;
    junctionTarget: EntityTarget<E>;
    where: FindOptionsWhere<E>;
    cachePrefix: string;
    cacheKey: string;
};

type PermissionJunction = {
    permission: any;
    policy_id?: string | null;
};

export async function loadBoundPermissions<E extends PermissionJunction & ObjectLiteral>(
    options: LoadBoundPermissionsOptions<E>,
): Promise<PermissionPolicyBinding[]> {
    const repository = options.manager.getRepository(options.junctionTarget);
    const relations = { permission: true } as FindOptionsRelations<E>;

    const entries = await repository.find({
        where: options.where,
        relations,
        cache: {
            id: buildRedisKeyPath({ prefix: options.cachePrefix, key: options.cacheKey }),
            milliseconds: 60_000,
        },
    });

    const policyIds = new Set<string>();
    for (const entry of entries) {
        if (entry.policy_id) {
            policyIds.add(entry.policy_id);
        }
    }

    const policyTrees = await loadPolicyTrees(options.manager, [...policyIds]);

    return entries.map((entry) => {
        const policies: BasePolicy[] = [];
        if (entry.policy_id && policyTrees[entry.policy_id]) {
            policies.push(policyTrees[entry.policy_id]);
        }

        return {
            permission: entry.permission,
            policies: policies.length > 0 ? policies : undefined,
        };
    });
}

async function loadPolicyTrees(
    manager: EntityManager,
    policyIds: string[],
): Promise<Record<string, BasePolicy>> {
    if (policyIds.length === 0) {
        return {};
    }

    const policyRepository = new PolicyRepository(manager);
    const result: Record<string, BasePolicy> = {};

    for (const id of policyIds) {
        const tree = await policyRepository.findDescendantsTreeById(id);
        if (tree) {
            result[id] = tree;
        }
    }

    return result;
}
