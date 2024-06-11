/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AttributeNamesPolicyEvaluator,
    AttributesPolicyEvaluator,
    BuiltInPolicyType,
    CompositePolicyEvaluator,
    DatePolicyEvaluator,
    TimePolicyEvaluator,
} from './built-in';

import type {
    AnyPolicy,
    PolicyEvaluationContext,
    PolicyEvaluator,
} from './types';

export class PolicyEnforcer {
    protected evaluators : Record<string, PolicyEvaluator>;

    constructor() {
        this.evaluators = {};
        this.registerDefaultEvaluators();
    }

    public registerEvaluator(
        type: string,
        evaluator: PolicyEvaluator,
    ) : void {
        this.evaluators[type] = evaluator;
    }

    private registerDefaultEvaluators() {
        this.registerEvaluator(BuiltInPolicyType.COMPOSITE, new CompositePolicyEvaluator(this.evaluators));
        this.registerEvaluator(BuiltInPolicyType.ATTRIBUTES, new AttributesPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.ATTRIBUTE_NAMES, new AttributeNamesPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.DATE, new DatePolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.TIME, new TimePolicyEvaluator());
    }

    evaluateMany(
        policies: AnyPolicy[],
        context: PolicyEvaluationContext,
    ) : boolean {
        for (let i = 0; i < policies.length; i++) {
            if (!this.evaluate(policies[i], context)) {
                return false;
            }
        }

        return true;
    }

    evaluate(
        policy: AnyPolicy,
        context: PolicyEvaluationContext,
    ) : boolean {
        const evaluator = this.evaluators[policy.type];
        if (!evaluator) {
            throw new Error('');
        }

        return evaluator.try(policy, context);
    }
}
