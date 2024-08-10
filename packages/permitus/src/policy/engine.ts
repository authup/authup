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
    DatePolicyEvaluator, RealmMatchPolicyEvaluator,
    TimePolicyEvaluator,
} from './built-in';
import type { PolicyEvaluator, PolicyEvaluators } from './evaluator';
import { evaluatePolicy } from './evaluator';

import type {
    AnyPolicy,
    PolicyEvaluationData,
} from './types';

/**
 * The policy engine is a component that interprets defined policies and makes decisions
 * on whether to allow or deny a particular access.
 */
export class PolicyEngine {
    protected evaluators : PolicyEvaluators;

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
        this.registerEvaluator(BuiltInPolicyType.COMPOSITE, new CompositePolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.ATTRIBUTES, new AttributesPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.ATTRIBUTE_NAMES, new AttributeNamesPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.DATE, new DatePolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.REALM_MATCH, new RealmMatchPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.TIME, new TimePolicyEvaluator());
    }

    async evaluateMany(
        policies: AnyPolicy[],
        data: PolicyEvaluationData,
    ) : Promise<boolean> {
        let outcome : boolean = true;
        for (let i = 0; i < policies.length; i++) {
            outcome = await this.evaluate(policies[i], data);
            if (!outcome) {
                return outcome;
            }
        }

        return outcome;
    }

    /**
     * @throws PolicyError
     *
     * @param policy
     * @param data
     */
    async evaluate(
        policy: AnyPolicy,
        data: PolicyEvaluationData,
    ) : Promise<boolean> {
        return evaluatePolicy(policy, data, this.evaluators);
    }
}
