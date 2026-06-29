/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '@authup/kit';
import type { BasePolicy } from '../../policy';
import { maxRealmScope, normalizeRealmScope } from '../realm-scope';
import type { PermissionPolicyBinding, PermissionPolicyBindingGrant } from '../types';
import { buildPermissionKey } from './key';

type CompositePolicy = BasePolicy & {
    decision_strategy?: `${DecisionStrategy}`,
    children: BasePolicy[],
};

/**
 * One disjunction term per original grant — keeps that grant's realm reach paired with its
 * OWN policies so a disjunction-aware evaluator can OR (reach ∧ policies) without the lossy
 * collapse of the top-level realm_scope/policies fields.
 */
function buildGrantTerm(binding: PermissionPolicyBinding): PermissionPolicyBindingGrant {
    return {
        realm_scope: normalizeRealmScope(binding.realm_scope),
        policies: binding.policies,
        decision_strategy: binding.permission.decision_strategy,
    };
}

/**
 * The disjunction terms a binding contributes to a merged result. An already-merged binding
 * carries its exact per-grant terms in `grants` — preserve them (keeps the merge idempotent),
 * otherwise synthesize a single term from the (raw) collapsed fields.
 */
function getGrantTerms(binding: PermissionPolicyBinding): PermissionPolicyBindingGrant[] {
    if (binding.grants && binding.grants.length > 0) {
        return binding.grants.map((grant) => ({
            realm_scope: normalizeRealmScope(grant.realm_scope),
            policies: grant.policies,
            decision_strategy: grant.decision_strategy,
        }));
    }

    return [buildGrantTerm(binding)];
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
            // Carry an explicit, coerced realm scope so downstream consumers
            // (evaluator, isSuperset) never see undefined (fail-closed default).
            output.push({
                ...first,
                realm_scope: maxRealmScope([first.realm_scope]),
                grants: getGrantTerms(first),
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

        // COLLAPSED realm scope (lossy) — for the consumers that need a single term per key
        // (isSuperset, junction-grant propagation, the memory provider). It is NOT the access
        // decision: a disjunction-aware evaluator reads `grants` below for the exact
        // per-grant (reach ∧ policies) semantics. Folds most-permissive-wins (ordered-MAX),
        // with the policy correlation that keeps the collapse fail-CLOSED: when the merge
        // fails open (some binding is policy-free, so `mergedPolicies` is dropped), fold ONLY
        // the policy-free bindings' scopes, so a policy-bound `any` grant's reach does not
        // leak into the unrestricted result. The mixed-grant reach that this collapse drops
        // (issue #3155) is recovered from `grants`, not here.
        const realmScope = typeof mergedPolicies === 'undefined' ?
            maxRealmScope(
                group
                    .filter((b) => !b.policies || b.policies.length === 0)
                    .map((b) => b.realm_scope),
            ) :
            maxRealmScope(group.map((b) => b.realm_scope));

        output.push({
            permission: {
                ...first.permission,
                decision_strategy: DecisionStrategy.AFFIRMATIVE,
            },
            policies: mergedPolicies,
            realm_scope: realmScope,
            // Exact per-grant disjunction terms (one per input grant — or its own terms if a
            // grant was already merged), preserved alongside the lossy collapse above so a
            // disjunction-aware evaluator can OR (reach ∧ policies) per grant — see
            // PermissionPolicyBinding.grants.
            grants: group.flatMap(getGrantTerms),
        });
    }

    return output;
}
