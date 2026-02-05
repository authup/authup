/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData } from '../data.ts';
import type { PolicyIssue } from '../issue';

export type PolicyEvaluators = Record<string, IPolicyEvaluator>;

export type PolicyEvaluationResult = {
    success: boolean,
    issues?: PolicyIssue[]
};

export type PolicyEvaluationContext = {
    readonly evaluators: Record<string, IPolicyEvaluator>,
    readonly path: (string | number)[],
    readonly exclude: string[],
    readonly include: string[],
    readonly data: PolicyData
};

export interface IPolicyEvaluator {
    /**
     * Execute the policy with specific data and a given context.
     */
    evaluate(value: Record<string, any>, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult>;
}
