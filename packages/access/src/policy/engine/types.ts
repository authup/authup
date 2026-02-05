/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationContext, PolicyEvaluationResult } from '../evaluator';
import type { IPolicy, PolicyData } from '../types';

export interface IPolicyEngine {
    evaluate(policy: IPolicy, data: PolicyData, options?: PolicyEvaluationContext) : Promise<PolicyEvaluationResult>;

}
