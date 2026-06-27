/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '@authup/kit';
import type { BasePolicy } from '../../policy';
import { maxRealmScope } from '../realm-scope';
import type { PermissionPolicyBinding } from '../types';
import { buildPermissionKey } from './key';

type CompositePolicy = BasePolicy & {
    decision_strategy?: `${DecisionStrategy}`,
    children: BasePolicy[],
};

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
            // Carry an explicit, coerced realm scope so downstream consumers
            // (evaluator, isSuperset) never see undefined (fail-closed default).
            output.push({
                ...first,
                realm_scope: maxRealmScope(first.realm_scope),
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

        // Realm scope folds most-permissive-wins (ordered-MAX). CRITICAL correlation with
        // the policy merge: when the merge fails open (some binding is policy-free, so
        // `mergedPolicies` is dropped), fold ONLY the policy-free bindings' scopes. A
        // policy-bound binding's reach is gated by its (now-dropped) policy, so letting its
        // scope leak into the unrestricted result would widen access — e.g. a policy-free
        // `own` grant + a policy-bound `any` grant must NOT merge to unrestricted `any`.
        // When all bindings are policy-bound (policies retained), every scope is gated, so
        // the full ordered-MAX is correct.
        const realmScope = typeof mergedPolicies === 'undefined' ?
            maxRealmScope(
                ...group
                    .filter((b) => !b.policies || b.policies.length === 0)
                    .map((b) => b.realm_scope),
            ) :
            maxRealmScope(...group.map((b) => b.realm_scope));

        output.push({
            permission: {
                ...first.permission,
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
            },
            policies: mergedPolicies,
            realm_scope: realmScope,
        });
    }

    return output;
}
