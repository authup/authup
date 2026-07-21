/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { Issue } from 'validup';
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
     * Execute the policy with specific data and a given context.
     */
    evaluate(value: Record<string, any>, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult>;
}
