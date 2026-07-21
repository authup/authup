/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import type { DecisionStrategy } from '@authup/kit';
import type { IPolicyEngine, PolicyData } from '../../policy';
import type { IPermissionProvider } from '../provider';

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
     */
    pendingPolicies?: 'deny' | 'permit',
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
