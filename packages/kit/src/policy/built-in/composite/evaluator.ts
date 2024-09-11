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
import type { PolicyData, PolicyWithType } from '../../types';
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
        return isCompositePolicy(ctx.spec);
    }

    async validateSpecification(ctx: PolicyEvaluateContext) : Promise<CompositePolicy> {
        return this.validator.run(ctx.spec);
    }

    async validateData(ctx: PolicyEvaluateContext<CompositePolicy>) : Promise<PolicyData> {
        return ctx.data;
    }

    async evaluate(ctx: PolicyEvaluateContext<CompositePolicy>): Promise<boolean> {
        let count = 0;

        for (let i = 0; i < ctx.spec.children.length; i++) {
            const childPolicy = ctx.spec.children[i];
            let outcome : boolean;

            if (isCompositePolicy(childPolicy)) {
                outcome = await this.evaluate({
                    ...ctx,
                    spec: childPolicy,
                });
            } else {
                outcome = await evaluatePolicy({
                    ...ctx,
                    spec: childPolicy,
                });
            }

            if (outcome) {
                if (ctx.spec.decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return maybeInvertPolicyOutcome(true, ctx.spec.invert);
                }

                count++;
            } else {
                if (ctx.spec.decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return maybeInvertPolicyOutcome(false, ctx.spec.invert);
                }

                count--;
            }
        }

        return maybeInvertPolicyOutcome(count > 0, ctx.spec.invert);
    }
}
