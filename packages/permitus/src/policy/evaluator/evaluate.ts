/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyError } from '../error';
import type {
    PolicyData,
    PolicyWithType,

} from '../types';
import type { PolicyEvaluatorContext, PolicyEvaluators } from './types';

export async function evaluatePolicy(
    policy: PolicyWithType,
    data: PolicyData,
    evaluators: PolicyEvaluators,
) : Promise<boolean> {
    const evaluator = evaluators[policy.type];
    if (!evaluator) {
        throw PolicyError.evaluatorNotFound(policy.type);
    }

    try {
        const executionContext : PolicyEvaluatorContext<PolicyWithType> = {
            data,
            policy,
            evaluators,
        };

        const canEvaluate = await evaluator.canEvaluate(executionContext);
        if (canEvaluate) {
            return await evaluator.safeEvaluate(executionContext);
        }
    } catch (e) {
        if (e instanceof PolicyError) {
            throw e;
        }

        if (e instanceof Error) {
            const error = new PolicyError(e.message);
            error.stack = e.stack;
            throw error;
        }

        throw new PolicyError();
    }

    throw PolicyError.evaluatorNotProcessable();
}
