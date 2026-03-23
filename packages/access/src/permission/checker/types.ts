/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '../../constants.ts';
import type { IPolicyEngine, PolicyData, PolicyWithType } from '../../policy';
import type { IPermissionProvider } from '../repository';

export type ResolveJunctionPolicyOptions = {
    name: string;
    realm_id?: string | null;
    client_id?: string | null;
};

export interface IPermissionEvaluator {
    evaluate(ctx: PermissionEvaluationContext): Promise<void>;

    evaluateOneOf(ctx: PermissionEvaluationContext): Promise<void>;

    preEvaluate(ctx: PermissionEvaluationContext): Promise<void>;

    preEvaluateOneOf(ctx: PermissionEvaluationContext): Promise<void>;

    resolveJunctionPolicy(options: ResolveJunctionPolicyOptions): Promise<PolicyWithType | undefined>;
}

export type PermissionEvaluatorOptions = {
    repository?: IPermissionProvider,
    policyEngine?: IPolicyEngine,
    realm_id?: string | null,
    client_id?: string | null
};

export type PermissionEvaluationOptions = {
    decision_strategy?: `${DecisionStrategy}`,
    policiesIncluded?: string[],
    policiesExcluded?: string[],
};

export type PermissionEvaluationContext = {
    name: string | string[],
    input?: PolicyData,
    options?: PermissionEvaluationOptions
};
