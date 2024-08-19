/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '../../../constants';
import { PolicyError } from '../../error';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import { evaluatePolicy } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyData, PolicyWithType } from '../../types';
import { isCompositePolicy } from './helper';
import type { CompositePolicy } from './types';
import { CompositePolicyValidator } from './validator';

export class CompositePolicyEvaluator implements PolicyEvaluator<CompositePolicy> {
    protected validator : CompositePolicyValidator;

    constructor() {
        this.validator = new CompositePolicyValidator();
    }

    async canEvaluate(
        ctx: PolicyEvaluatorContext<PolicyWithType>,
    ) : Promise<boolean> {
        return isCompositePolicy(ctx.policy);
    }

    async safeEvaluate(ctx: PolicyEvaluatorContext) : Promise<boolean> {
        const policy = await this.validator.run(ctx.policy);

        return this.evaluate({
            ...ctx,
            policy,
        });
    }

    async evaluate(ctx: PolicyEvaluatorContext<CompositePolicy, PolicyData>): Promise<boolean> {
        let count = 0;

        for (let i = 0; i < ctx.policy.children.length; i++) {
            const childPolicy = ctx.policy.children[i];
            let outcome : boolean;

            if (isCompositePolicy(childPolicy)) {
                outcome = await this.evaluate({
                    ...ctx,
                    policy: childPolicy,
                });
            } else {
                if (typeof ctx.evaluators === 'undefined') {
                    throw PolicyError.evaluatorNotFound(childPolicy.type);
                }

                outcome = await evaluatePolicy(childPolicy, ctx.data, ctx.evaluators);
            }

            if (outcome) {
                if (ctx.policy.decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return maybeInvertPolicyOutcome(true, ctx.policy.invert);
                }

                count++;
            } else {
                if (ctx.policy.decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return maybeInvertPolicyOutcome(false, ctx.policy.invert);
                }

                count--;
            }
        }

        return maybeInvertPolicyOutcome(count > 0, ctx.policy.invert);
    }
}
