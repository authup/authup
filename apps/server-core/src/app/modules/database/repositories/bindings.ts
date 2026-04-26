/*
 * Copyright (c) 2025.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    In,
} from 'typeorm';
import type {
    EntityManager,
    EntityTarget,
    FindOptionsRelations,
    FindOptionsWhere,
    ObjectLiteral,
} from 'typeorm';
import type { BasePolicy, PermissionPolicyBinding } from '@authup/access';
import type { Permission } from '@authup/core-kit';
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
    permission: Permission;
    policy_id?: string | null;
};

const IN_CLAUSE_CHUNK_SIZE = 500;

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

    return mapEntriesToBindings(options.manager, entries);
}

export type LoadBoundPermissionsForManyOptions<E extends ObjectLiteral> = {
    manager: EntityManager;
    junctionTarget: EntityTarget<E>;
    column: keyof E & string;
    ids: string[];
    chunkSize?: number;
};

export async function loadBoundPermissionsForMany<E extends PermissionJunction & ObjectLiteral>(
    options: LoadBoundPermissionsForManyOptions<E>,
): Promise<PermissionPolicyBinding[]> {
    if (options.ids.length === 0) {
        return [];
    }

    const repository = options.manager.getRepository(options.junctionTarget);
    const relations = { permission: true } as FindOptionsRelations<E>;
    const chunkSize = options.chunkSize ?? IN_CLAUSE_CHUNK_SIZE;

    const chunks: string[][] = [];
    for (let i = 0; i < options.ids.length; i += chunkSize) {
        chunks.push(options.ids.slice(i, i + chunkSize));
    }

    const results = await Promise.all(
        chunks.map((chunk) => repository.find({
            where: { [options.column]: In(chunk) } as FindOptionsWhere<E>,
            relations,
        })),
    );

    return mapEntriesToBindings(options.manager, results.flat());
}

async function mapEntriesToBindings<E extends PermissionJunction & ObjectLiteral>(
    manager: EntityManager,
    entries: E[],
): Promise<PermissionPolicyBinding[]> {
    const policyIds = new Set<string>();
    for (const entry of entries) {
        if (entry.policy_id) {
            policyIds.add(entry.policy_id);
        }
    }

    const policyTrees = await loadPolicyTrees(manager, [...policyIds]);

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
    const trees = await Promise.all(
        policyIds.map((id) => policyRepository.findDescendantsTreeById(id)
            .then((tree) => [id, tree] as const)),
    );

    const result: Record<string, BasePolicy> = {};
    for (const [id, tree] of trees) {
        if (tree) {
            result[id] = tree;
        }
    }
    return result;
}
