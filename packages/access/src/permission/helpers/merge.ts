/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '@authup/kit';
import type { BasePolicy } from '../../policy';
import type { RealmReach } from '../realm-scope.ts';
import { mergeRealmReach } from '../realm-scope.ts';
import type { PermissionPolicyBinding } from '../types';
import { buildPermissionKey } from './key';

type CompositePolicy = BasePolicy & {
    decision_strategy?: `${DecisionStrategy}`,
    children: BasePolicy[],
};

function bindingReach(binding: PermissionPolicyBinding): RealmReach {
    return { scope: binding.realm_scope ?? 'own', realm_ids: binding.realm_ids };
}

export function mergePermissionPolicyBindings(input: PermissionPolicyBinding[]) : PermissionPolicyBinding[] {
    const grouped : Record<string, PermissionPolicyBinding[]> = input
        .reduce((previous, current) => {
            const key = buildPermissionKey(current.permission);
            if (!previous[key]) {
                previous[key] = [];
            }

            previous[key].push(current);

            return previous;
        }, {} as Record<string, PermissionPolicyBinding[]>);

    const output : PermissionPolicyBinding[] = [];
    const keys = Object.keys(grouped);
    for (const key of keys) {
        const group = grouped[key]!;
        const first = group[0]!;

        if (group.length === 1) {
            // Carry an explicit, coerced realm reach so downstream consumers
            // (evaluator, isSuperset) never see undefined (fail-closed default).
            const reach = mergeRealmReach([bindingReach(first)]);
            output.push({
                ...first,
                realm_scope: reach.scope,
                realm_ids: reach.realm_ids,
            });
            continue;
        }

        const children : BasePolicy[] = [];

        for (const element of group) {
            if (!element.policies || element.policies.length === 0) {
                continue;
            }

            const policy: CompositePolicy = {
                type: 'composite',
                decision_strategy: element.permission.decision_strategy || DecisionStrategy.UNANIMOUS,
                children: element.policies,
            };

            children.push(policy);
        }

        let mergedPolicies: BasePolicy[] | undefined;

        if (
            children.length > 0 &&
            children.length === group.length
        ) {
            const policy: CompositePolicy = {
                type: 'composite',
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
                children,
            };

            mergedPolicies = [policy];
        }

        // Realm reach folds most-permissive-wins (ordered-MAX scope + union of
        // realm_ids) — a separate algebra from the AFFIRMATIVE policy composite above,
        // independent of the fail-open "any binding without policies => unrestricted" rule.
        const reach = mergeRealmReach(group.map(bindingReach));

        output.push({
            permission: {
                ...first.permission,
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
            },
            policies: mergedPolicies,
            realm_scope: reach.scope,
            realm_ids: reach.realm_ids,
        });
    }

    return output;
}
