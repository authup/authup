/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { DecisionStrategy } from '../../constants.ts';
import type { IPolicyEngine, PolicyData } from '../../policy';
import type { IPermissionProvider } from '../provider';

export interface IPermissionEvaluator {
    evaluate(ctx: PermissionEvaluationContext): Promise<void>;

    evaluateOneOf(ctx: PermissionEvaluationContext): Promise<void>;

    preEvaluate(ctx: PermissionEvaluationContext): Promise<void>;

    preEvaluateOneOf(ctx: PermissionEvaluationContext): Promise<void>;
}

export type PermissionEvaluatorOptions = {
    repository?: IPermissionProvider,
    policyEngine?: IPolicyEngine,
    realmId?: string | null,
    clientId?: string | null
};

export type PermissionEvaluationOptions = {
    decisionStrategy?: `${DecisionStrategy}`,
    policiesIncluded?: string[],
    policiesExcluded?: string[],
};

export type PermissionEvaluationContext = {
    name: string | string[],
    realmId?: string | null,
    clientId?: string | null,
    input?: PolicyData,
    options?: PermissionEvaluationOptions
};
