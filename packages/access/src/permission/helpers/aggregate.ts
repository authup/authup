/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '@authup/kit';
import type { BasePolicy } from '../../policy';
import { normalizeRealmScope } from '../realm-scope';
import type {
    PermissionGrant,
    PermissionPolicyBinding,
    PermissionPolicyBindingAggregated,
} from '../types';
import { buildPermissionKey } from './key';

type CompositePolicy = BasePolicy & {
    decision_strategy?: `${DecisionStrategy}`,
    children: BasePolicy[],
};

/**
 * One disjunction term per raw binding: the grant's realm reach (fail-closed `own` default)
 * paired with its policy — the raw single policy (its `id` preserved for junction propagation),
 * a composite over multiple policies (Layer-1 permission policies, combined under the
 * permission's decision_strategy), or `undefined` when the grant is unrestricted.
 */
function buildGrant(binding: PermissionPolicyBinding): PermissionGrant {
    let policy: BasePolicy | undefined;
    if (binding.policies && binding.policies.length === 1) {
        policy = binding.policies[0];
    } else if (binding.policies && binding.policies.length > 1) {
        const composite: CompositePolicy = {
            type: 'composite',
            decision_strategy: binding.permission.decision_strategy || DecisionStrategy.UNANIMOUS,
            children: binding.policies,
        };
        policy = composite;
    }

    return {
        realm_scope: normalizeRealmScope(binding.realm_scope),
        policy,
    };
}

/**
 * Group raw permission-policy bindings by permission key into the actor's disjunction of
 * `(realm_scope, policy)` grants per permission — with NO lossy collapse. Every consumer
 * (the binding evaluator, isSuperset, junction propagation, the memory provider) evaluates the
 * grant disjunction directly, so each grant's realm reach stays paired with the policy that
 * gates it.
 */
export function aggregatePermissionPolicyBindings(
    input: PermissionPolicyBinding[],
): PermissionPolicyBindingAggregated[] {
    const grouped: Record<string, PermissionPolicyBinding[]> = input
        .reduce((previous, current) => {
            const key = buildPermissionKey(current.permission);
            if (!previous[key]) {
                previous[key] = [];
            }

            previous[key].push(current);

            return previous;
        }, {} as Record<string, PermissionPolicyBinding[]>);

    const output: PermissionPolicyBindingAggregated[] = [];
    for (const key of Object.keys(grouped)) {
        const group = grouped[key]!;
        output.push({
            permission: group[0]!.permission,
            grants: group.map(buildGrant),
        });
    }

    return output;
}
