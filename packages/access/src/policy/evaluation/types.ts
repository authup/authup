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
     * EXACT condition form of the pending subtree (see
     * {@link IPolicyEvaluator.toCondition}): a row satisfies the condition iff the
     * pending subtree settles true on that row's attributes, given the current bag.
     * Attached only on pending results, only when the evaluation context requested it
     * (`withConditions`), and only when the ENTIRE pending subtree is expressible —
     * a partially expressible tree carries no condition (fail-safe: the consumer
     * falls back to a per-row post-check).
     */
    condition?: ICondition,
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
