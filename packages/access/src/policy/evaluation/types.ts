/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyIssue } from '../issue';
import type { PolicyEvaluationContext } from './context';

export type PolicyEvaluators = Record<string, IPolicyEvaluator>;

export type PolicyEvaluationResult = {
    success: boolean,
    issues?: PolicyIssue[]
};

export interface IPolicyEvaluator {
    /**
     * Execute the policy with specific data and a given context.
     */
    evaluate(value: Record<string, any>, context: PolicyEvaluationContext): Promise<PolicyEvaluationResult>;
}
