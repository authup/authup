/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { ICondition } from '@rapiq/core';
import type { Issue } from '@ebec/core';
import type { PolicyEvaluationContext } from './context';

export type PolicyEvaluators = Record<string, IPolicyEvaluator>;

export type PolicyEvaluationResult = {
    success: boolean,
    /**
     * The policy could not be settled yet — a data key it requires is absent from the
     * evaluation bag (see {@link IPolicyEvaluator.requires}). Pending always rides on
     * `success: false` (fail-closed: a consumer that ignores the flag behaves like a
     * deny); only pre-gate style consumers treat pending as a pass.
     *
     * Unknown stays unknown: `invert` is never applied to a pending result.
     */
    pending?: boolean,
    /**
     * The policy could not be evaluated at all: it has no type or no evaluator, its
     * evaluator threw, its configuration is invalid, or data it needs is missing or
     * malformed without being declared (see {@link IPolicyEvaluator.requires}).
     * Unlike `pending` it will not resolve once more data arrives. Unevaluable always
     * rides on `success: false`, never together with `pending`, and never carries a
     * `condition` or `failCondition`: every consumer treats it as a deny.
     *
     * Unknown stays unknown: `invert` is never applied to an unevaluable result, so
     * a negated parent can not turn a failure to evaluate into a pass.
     */
    unevaluable?: boolean,
    /**
     * The one settled outcome a pending subtree can still reach, once part of it
     * could not be evaluated. Absent: it can still pass or fail. `pass`: it can pass
     * or stay not evaluable, never fail. `fail`: it can fail or stay not evaluable,
     * never pass, so a pre-gate style consumer denies it like a settled false.
     *
     * Only on pending results. It is the fact that survives when nothing lowers: a
     * result that can only still fail carries no `condition`, one that can only
     * still pass no `failCondition`. `invert` swaps the two values instead of
     * touching `success`.
     */
    reachable?: 'pass' | 'fail',
    /**
     * EXACT condition form of the rows the pending subtree PASSES for (see
     * {@link IPolicyEvaluator.toCondition}): a row satisfies the condition iff the
     * pending subtree settles true on that row's attributes, given the current bag.
     * Attached only on pending results, only when the evaluation context requested it
     * (`withConditions`), and only when that side of the subtree is expressible.
     * Otherwise the result carries no condition (fail-safe: the consumer falls back
     * to a per-row post-check). A row it does not hold for either fails or could not
     * be evaluated; which of the two is what `failCondition` states.
     */
    condition?: ICondition,
    /**
     * EXACT condition form of the rows the pending subtree FAILS for: a row
     * satisfies it iff the subtree settles false on that row's attributes, given the
     * current bag. Attached under the same terms as `condition`. It is what `invert`
     * turns into the pass condition of a negated parent, so negation never reads a
     * row that could not be evaluated as a failure. Absent means unknown, never
     * "everything else": the engine derives it as the negation of `condition` only
     * for a leaf it lowers itself through {@link IPolicyEvaluator.toCondition}.
     */
    failCondition?: ICondition,
    issues?: Issue[]
};

export interface IPolicyEvaluator {
    /**
     * PolicyData keys this policy needs before it can settle (e.g. `identity`,
     * `attributes`). When any returned key is absent from the evaluation bag, the
     * engine returns a pending result instead of invoking {@link evaluate}.
     *
     * Receives the raw (unvalidated) policy configuration, since data needs may be
     * config-dependent (e.g. realm-match scope vs. attribute mode). Omit the method
     * (or return an empty array) for policies evaluable with ambient data only.
     */
    requires?(value: Record<string, any>): string[];

    /**
     * Express the policy as a condition over row attributes (rapiq `ICondition`)
     * instead of waiting for the row — the WHERE-pushdown capability. The result is
     * a partial evaluation against the knowns in `context.data` (e.g. the actor's
     * realm is baked into a realm-match condition), and must be EXACT: for every
     * row, `condition(row)` === "this policy settles true with attributes = row".
     *
     * Return `null` when this configuration is not expressible (the policy then
     * stays a per-row post-check — always sound). Omit the method for policies that
     * never lower (identity, date/time, attributeNames).
     */
    toCondition?(value: Record<string, any>, context: PolicyEvaluationContext): Promise<ICondition | null>;

    /**
     * Execute the policy with specific data and a given context.
     */
    evaluate(value: Record<string, any>, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult>;
}
