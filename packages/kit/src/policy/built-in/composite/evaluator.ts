/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyDecisionStrategy } from '../../constants';
import { PolicyError } from '../../error';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import { evaluatePolicy } from '../../evaluator';
import { invertPolicyOutcome } from '../../utils';
import { BuiltInPolicyType } from '../constants';
import { isCompositePolicy } from './helper';
import type { CompositePolicyOptions } from './types';

export class CompositePolicyEvaluator<
    C extends Record<string, any> = Record<string, any>,
> implements PolicyEvaluator<CompositePolicyOptions, C> {
    verify(
        ctx: PolicyEvaluatorContext<any, any>,
    ): ctx is PolicyEvaluatorContext<CompositePolicyOptions, C> {
        return ctx.options.type === BuiltInPolicyType.COMPOSITE;
    }

    execute(ctx: PolicyEvaluatorContext<CompositePolicyOptions, C>): boolean {
        let count = 0;

        for (let i = 0; i < ctx.options.children.length; i++) {
            const childPolicy = ctx.options.children[i];
            let outcome : boolean;

            if (isCompositePolicy(childPolicy)) {
                outcome = this.execute({
                    ...ctx,
                    options: childPolicy,
                });
            } else {
                if (typeof ctx.evaluators === 'undefined') {
                    throw PolicyError.evaluatorNotFound(childPolicy.type);
                }

                outcome = evaluatePolicy(childPolicy, ctx.data, ctx.evaluators);
            }

            if (outcome) {
                if (ctx.options.decisionStrategy === PolicyDecisionStrategy.AFFIRMATIVE) {
                    return invertPolicyOutcome(true, ctx.options.invert);
                }

                count++;
            } else {
                if (ctx.options.decisionStrategy === PolicyDecisionStrategy.UNANIMOUS) {
                    return invertPolicyOutcome(false, ctx.options.invert);
                }

                count--;
            }
        }

        return invertPolicyOutcome(count >= 0, ctx.options.invert);
    }
}
