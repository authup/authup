/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { DecisionStrategy } from '../../../constants';
import type { PolicyEvaluateContext, PolicyEvaluator } from '../../evaluator';
import { evaluatePolicy } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyInput, PolicyWithType } from '../../types';
import { isCompositePolicy } from './helper';
import type { CompositePolicy } from './types';
import { CompositePolicyValidator } from './validator';

export class CompositePolicyEvaluator implements PolicyEvaluator<CompositePolicy> {
    protected validator : CompositePolicyValidator;

    constructor() {
        this.validator = new CompositePolicyValidator();
    }

    async can(
        ctx: PolicyEvaluateContext<PolicyWithType>,
    ) : Promise<boolean> {
        return isCompositePolicy(ctx.config);
    }

    async validateConfig(ctx: PolicyEvaluateContext) : Promise<CompositePolicy> {
        return this.validator.run(ctx.config);
    }

    async validateInput(ctx: PolicyEvaluateContext<CompositePolicy>) : Promise<PolicyInput> {
        return ctx.input;
    }

    async evaluate(ctx: PolicyEvaluateContext<CompositePolicy>): Promise<boolean> {
        let count = 0;

        const decisionStrategy = ctx.config.decisionStrategy ??
            DecisionStrategy.UNANIMOUS;

        for (let i = 0; i < ctx.config.children.length; i++) {
            const childPolicy = ctx.config.children[i];
            let outcome : boolean;

            if (isCompositePolicy(childPolicy)) {
                outcome = await this.evaluate({
                    ...ctx,
                    config: childPolicy,
                });
            } else {
                outcome = await evaluatePolicy({
                    ...ctx,
                    config: childPolicy,
                });
            }

            if (outcome) {
                if (decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return maybeInvertPolicyOutcome(true, ctx.config.invert);
                }

                count++;
            } else {
                if (decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return maybeInvertPolicyOutcome(false, ctx.config.invert);
                }

                count--;
            }
        }

        return maybeInvertPolicyOutcome(count > 0, ctx.config.invert);
    }
}
