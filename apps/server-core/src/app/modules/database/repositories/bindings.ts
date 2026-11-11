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
import { RealmScope } from '@authup/access';
import type { EntityType, Permission, Role } from '@authup/core-kit';
import { defineQuery } from '@rapiq/core';
import { PolicyRepository } from '../../../../adapters/database/domains/policy/index.ts';
import type { IQueryCache } from '../cache/index.ts';

type LoadBoundOptions<E extends ObjectLiteral> = {
    manager: EntityManager;
    cache: IQueryCache;
    junctionTarget: EntityTarget<E>;
    schema: EntityType;
    ownerColumn: string;
    ownerId: string;
};

export type LoadBoundRolesOptions<E extends ObjectLiteral> = LoadBoundOptions<E>;

export type LoadBoundPermissionsOptions<E extends ObjectLiteral> = LoadBoundOptions<E>;

type RoleJunction = {
    role: Role;
};

type PermissionJunction = {
    permission: Permission;
    policyId?: string | null;
    realmScope?: `${RealmScope}` | null;
};

async function loadJunctions<E extends ObjectLiteral>(
    options: LoadBoundOptions<E>,
    relation: string,
): Promise<E[]> {
    const id = options.ownerId.toLowerCase();
    const repository = options.manager.getRepository(options.junctionTarget);

    return options.cache.rememberQuery<E[]>(
        {
            key: `grant/${options.schema}/${options.ownerColumn}=${id}/${relation}`,
            query: defineQuery({
                filters: { [options.ownerColumn]: id },
                relations: [relation],
            }),
            schema: options.schema,
            caseSensitive: [options.ownerColumn],
        },
        () => repository.find({
            where: { [options.ownerColumn]: id } as FindOptionsWhere<E>,
            relations: { [relation]: true } as FindOptionsRelations<E>,
        }),
        { manager: options.manager },
    );
}

export async function loadBoundRoles<E extends RoleJunction & ObjectLiteral>(
    options: LoadBoundRolesOptions<E>,
): Promise<Role[]> {
    const entries = await loadJunctions(options, 'role');

    return entries.map((entry) => entry.role);
}

export async function loadBoundPermissions<E extends PermissionJunction & ObjectLiteral>(
    options: LoadBoundPermissionsOptions<E>,
): Promise<PermissionPolicyBinding[]> {
    const entries = await loadJunctions(options, 'permission');

    const policyIds = new Set<string>();

    for (const entry of entries) {
        if (entry.policyId) {
            policyIds.add(entry.policyId);
        }
    }

    const policyTrees = await loadPolicyTrees(options.manager, [...policyIds]);

    return entries.map((entry) => {
        const policies: BasePolicy[] = [];

        if (entry.policyId && policyTrees[entry.policyId]) {
            policies.push(policyTrees[entry.policyId]);
        }

        return {
            permission: entry.permission,
            policies: policies.length > 0 ? policies : undefined,
            // Fail-closed coercion: a missing column (stale cache / pre-migration row)
            // becomes the most restrictive `own`.
            realmScope: entry.realmScope ?? RealmScope.OWN,
        };
    });
}

export async function loadPolicyTrees(
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
