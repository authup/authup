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
 * A raw permission grant: one permission with its policies and realm reach, as loaded from a
 * role/identity junction. `aggregatePermissionPolicyBindings` groups these per permission into
 * a `PermissionPolicyBindingAggregated` (the lossless disjunction of grants).
 */
export type PermissionPolicyBinding = {
    permission: BasePermission,
    policies?: BasePolicy[],
    /**
     * Relative realm reach of this grant (none/own/ownOrNull/any). Absent coerces to the
     * most restrictive `own` (fail-closed). NOT part of the binding identity key
     * (see isPermissionPolicyBindingEqual).
     */
    realm_scope?: `${RealmScope}`,
};

/**
 * One disjunction term of an aggregated binding: a single grant's realm reach paired with its
 * own (single) policy. A disjunction-aware consumer ORs `realmScopeMatches(realm_scope) ∧ policy`
 * across the grants of a permission.
 */
export type PermissionGrant = {
    /** Relative realm reach (none/own/ownOrNull/any), normalized — fail-closed default `own`. */
    realm_scope: `${RealmScope}`,
    /**
     * The grant's policy: the raw junction policy (its `id` preserved, for propagation) for a
     * single-policy grant, a composite for a multi-policy (Layer-1) binding, or `undefined`
     * when the grant carries no restriction.
     */
    policy?: BasePolicy,
};

/**
 * A permission together with the actor's disjunction of grants for it. Output of
 * `aggregatePermissionPolicyBindings` — the honest, lossless replacement for the collapsed
 * `PermissionPolicyBinding` (no top-level realm_scope/policies; the access decision is the
 * OR over `grants`).
 */
export type PermissionPolicyBindingAggregated = {
    permission: BasePermission,
    grants: PermissionGrant[],
};
