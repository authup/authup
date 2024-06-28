/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyError } from '../error';
import type {
    AnyPolicy,
    PolicyEvaluationContext,

} from '../types';
import type { PolicyEvaluatorContext, PolicyEvaluators } from './types';

export function evaluatePolicy(
    policy: AnyPolicy,
    context: PolicyEvaluationContext,
    evaluators: PolicyEvaluators,
) {
    const evaluator = evaluators[policy.type];
    if (!evaluator) {
        throw PolicyError.evaluatorNotFound(policy.type);
    }

    try {
        const executionContext : PolicyEvaluatorContext<any, any> = {
            data: context,
            options: policy,
            evaluators,
        };

        if (evaluator.canEvaluate(executionContext)) {
            return evaluator.evaluate(executionContext);
        }
    } catch (e) {
        if (e instanceof PolicyError) {
            throw e;
        }

        const error = new PolicyError(e.message);
        error.stack = e.stack;
        throw error;
    }

    throw PolicyError.evaluatorNotProcessable();
}
