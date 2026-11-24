/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import type { DecisionStrategy } from '@authup/kit';
import type { IPolicyEngine, PolicyData, PolicyTransitionSink } from '../../policy/index.ts';
import type { IPermissionProvider } from '../provider/index.ts';
import type { RecordRealm } from '../record/index.ts';

export interface IPermissionEvaluator {
    evaluate(ctx: PermissionEvaluationContext): Promise<void>;

    evaluateOneOf(ctx: PermissionEvaluationContext): Promise<void>;

    preEvaluate(ctx: PermissionEvaluationContext): Promise<void>;

    preEvaluateOneOf(ctx: PermissionEvaluationContext): Promise<void>;

    compile(ctx: PermissionCompileContext): Promise<PermissionCompileResult>;
}

export type PermissionEvaluatorOptions = {
    provider: IPermissionProvider,
    policyEngine?: IPolicyEngine,
    realmId?: string | null,
    clientId?: string | null
};

export type PermissionEvaluationOptions = {
    decisionStrategy?: `${DecisionStrategy}`,
    policiesIncluded?: string[],
    policiesExcluded?: string[],
    /**
     * How a grant whose policy evaluation is PENDING (a required data key is absent —
     * see `PolicyEvaluationResult.pending`) is treated:
     *
     * - `deny` (default): pending counts as failure — full `evaluate()` semantics,
     *   matching the historical missing-data deny.
     * - `permit`: pending counts as pass — the data-availability-derived pre-gate
     *   (`preEvaluate()`): only a tree that settles false with the current bag denies.
     *   A pending tree that can only still fail (`reachable: 'fail'`) denies as well.
     */
    pendingPolicies?: 'deny' | 'permit',
    /**
     * Receives the instants at which a clock-dependent policy (`date`, `time`)
     * in an evaluated tree could change its verdict, so a caller caching the
     * outcome knows when it expires. Handed to every policy evaluation this call
     * runs; a policy-free grant evaluates nothing and reports nothing.
     */
    transitions?: PolicyTransitionSink,
};

export type PermissionEvaluationContext = {
    name: string | string[],
    realmId?: string | null,
    clientId?: string | null,
    data?: PolicyData,
    options?: PermissionEvaluationOptions
};

export type PermissionCompileContext = {
    /**
     * Permission name(s). Several names compile as a disjunction — the row is
     * readable when ANY of them passes (`evaluateOneOf` semantics).
     */
    name: string | string[],
    realmId?: string | null,
    clientId?: string | null,
    /**
     * The knowns bag (typically the actor identity). Row-dependent keys
     * (`attributes`, `realmMatch`) are deliberately absent — they are what the
     * compiled condition ranges over.
     */
    data?: PolicyData,
    /**
     * Row column the realm reach is lowered onto, when the rows this compilation
     * ranges over carry their realm under another name — a junction's owner-realm
     * key (`roleRealmId`, `clientRealmId`, …). Default `realmId`. Affects the
     * `conditional` condition only; the per-row `post` fallback still reads the
     * realm from the `realmMatch` data key its caller supplies.
     */
    realmAttributeName?: string,
    /**
     * Row column holding the owning client, which a `clientMatch` grant policy
     * is lowered onto. Unset, such a grant is checked per row (`post`).
     */
    clientAttributeName?: string,
    /**
     * The realm every row of the compilation belongs to, for a resource whose
     * rows carry no realm column. A realm (id, name, `null` for global, or a
     * list every entry of which must be reached) settles each grant's realm
     * reach against it instead of lowering it onto a column; `false` names a
     * resource that belongs to no realm, so the reach neutral-passes as in
     * `evaluateRecord` with `realm: false`. Either way only the remaining
     * policy terms become query conditions. Absent, the reach is lowered onto
     * {@link realmAttributeName}. Must not be combined with a `realmMatch` key
     * in `data`.
     */
    realm?: RecordRealm | false,
};

/**
 * Outcome of compiling a permission's policy trees against the knowns bag
 * (issue #3286 phase 3) — the query-build counterpart of `evaluate()`:
 *
 * - `allow` — settled true for every row; no restriction needed.
 * - `deny` — settled false for every row; no row can pass.
 * - `conditional` — the EXACT residual as a rapiq condition over row attributes:
 *   push it into the row query (WHERE) and skip per-row post-evaluation.
 * - `post` — some pending policy is not expressible as a condition; fall back to
 *   loading rows and evaluating per row (always sound).
 */
export type PermissionCompileResult = { verdict: 'allow' } |
    { verdict: 'deny' } |
    { verdict: 'conditional', condition: ICondition } |
    { verdict: 'post' };
