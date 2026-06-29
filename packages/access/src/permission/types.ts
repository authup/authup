/*
 * Copyright (c) 2021-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { BasePolicy } from '../policy';
import type { DecisionStrategy } from '@authup/kit';
import type { RealmScope } from './realm-scope';

export type BasePermission = {
    name: string;
    client_id?: string | null,
    realm_id?: string | null,
    decision_strategy?: `${DecisionStrategy}` | null
};

/**
 * One disjunction term of a merged binding — a single grant's realm reach paired with its
 * OWN policies. A disjunction-aware evaluator ORs over these, keeping `realm_scope` and
 * `policies` correlated per grant.
 */
export type PermissionPolicyBindingGrant = {
    /** Relative realm reach of this single grant (none/own/ownOrNull/any). */
    realm_scope?: `${RealmScope}`,
    /** Policies attached to this single grant (its junction policy_id tree, etc.). */
    policies?: BasePolicy[],
    /** How this grant's own policies combine (defaults to UNANIMOUS). */
    decision_strategy?: `${DecisionStrategy}` | null,
};

export type PermissionPolicyBinding = {
    permission: BasePermission,
    policies?: BasePolicy[],
    /**
     * Relative realm reach of this grant (none/own/ownOrNull/any). Merged across
     * grants by ordered-MAX; absent coerces to the most restrictive `own` (fail-closed).
     * NOT part of the binding identity key (see isPermissionPolicyBindingEqual).
     */
    realm_scope?: `${RealmScope}`,
    /**
     * The individual (realm_scope, policies) grants merged into this binding — one term per
     * input grant. A disjunction-aware evaluator ORs over them, access iff
     *   ∃ grant . realmScopeMatches(grant.realm_scope, resource) ∧ (grant.policies pass)
     * — keeping each grant's realm reach paired with its OWN policies. The top-level
     * `realm_scope`/`policies` above are a LOSSY collapse (fail-closed for a mix of
     * policy-free + policy-bound grants — see mergePermissionPolicyBindings) kept for
     * consumers that need a single term per key (isSuperset, junction-grant propagation,
     * the memory provider). Populated by mergePermissionPolicyBindings.
     */
    grants?: PermissionPolicyBindingGrant[],
};
