/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyType } from './constants';
import {
    GroupPolicyEvaluator,
} from './protocol';
import type { PolicyBase, PolicyEvaluationContext, PolicyEvaluator } from './types';

export class PolicyEnforcer {
    protected evaluators : Record<string, PolicyEvaluator>;

    constructor(evaluators: Record<string, PolicyEvaluator>) {
        this.evaluators = evaluators;

        this.evaluators[PolicyType.GROUP] = new GroupPolicyEvaluator(this.evaluators);
    }

    execute(policies: PolicyBase[], context: PolicyEvaluationContext) {
        for (let i = 0; i < policies.length; i++) {
            if (!this.evaluate(policies[i], context)) {
                return false;
            }
        }

        return true;
    }

    evaluate(
        policy: PolicyBase,
        context: PolicyEvaluationContext,
    ) : boolean {
        const evaluator = this.evaluators[policy.type];
        if (!evaluator) {
            throw new Error('');
        }

        return evaluator.try(policy, context);
    }
}
