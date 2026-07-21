/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '@authup/kit';
import type { IPolicyEngine, PolicyData } from '../../policy';
import type { IPermissionProvider } from '../provider';

export interface IPermissionEvaluator {
    evaluate(ctx: PermissionEvaluationContext): Promise<void>;

    evaluateOneOf(ctx: PermissionEvaluationContext): Promise<void>;

    preEvaluate(ctx: PermissionEvaluationContext): Promise<void>;

    preEvaluateOneOf(ctx: PermissionEvaluationContext): Promise<void>;
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
