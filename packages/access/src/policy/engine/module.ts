/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AttributeNamesPolicyEvaluator,
    AttributesPolicyEvaluator,
    BuiltInPolicyType,
    CompositePolicyEvaluator,
    DatePolicyEvaluator, IdentityPolicyEvaluator, PermissionBindingPolicyEvaluator,
    RealmMatchPolicyEvaluator,
    TimePolicyEvaluator,
} from '../built-in';
import type { PolicyEvaluator, PolicyEvaluators } from '../evaluator';
import {
    evaluatePolicy,
} from '../evaluator';
import type { PolicyEngineEvaluateContext } from './types';

/**
 * The policy engine is a component that interprets defined policies and makes decisions
 * on whether to allow or deny a particular access.
 */
export class PolicyEngine {
    protected evaluators : PolicyEvaluators;

    constructor(evaluators: PolicyEvaluators = {}) {
        this.evaluators = {};
        this.registerDefaultEvaluators();
        this.registerEvaluators(evaluators);
    }

    public registerEvaluator(
        type: string,
        evaluator: PolicyEvaluator,
    ) : void {
        this.evaluators[type] = evaluator;
    }

    public registerEvaluators(evaluators: PolicyEvaluators) {
        const keys = Object.keys(evaluators);
        for (let i = 0; i < keys.length; i++) {
            this.registerEvaluator(keys[i], evaluators[keys[i]]);
        }
    }

    private registerDefaultEvaluators() {
        this.registerEvaluator(BuiltInPolicyType.COMPOSITE, new CompositePolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.ATTRIBUTES, new AttributesPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.ATTRIBUTE_NAMES, new AttributeNamesPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.DATE, new DatePolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.IDENTITY, new IdentityPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.PERMISSION_BINDING, new PermissionBindingPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.REALM_MATCH, new RealmMatchPolicyEvaluator());
        this.registerEvaluator(BuiltInPolicyType.TIME, new TimePolicyEvaluator());
    }

    /**
     * @throws PolicyError
     *
     * @param ctx
     */
    async evaluate(ctx: PolicyEngineEvaluateContext) : Promise<boolean> {
        return evaluatePolicy({
            ...ctx,
            options: ctx.options || {},
            evaluators: this.evaluators,
        });
    }
}
