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
import { maybeInvertPolicyOutcome } from '../../utils';
import { BuiltInPolicyType } from '../constants';
import { isCompositePolicy } from './helper';
import type { CompositePolicyOptions } from './types';

export class CompositePolicyEvaluator<
    C extends Record<string, any> = Record<string, any>,
> implements PolicyEvaluator<CompositePolicyOptions, C> {
    async canEvaluate(
        ctx: PolicyEvaluatorContext<any, any>,
    ) : Promise<boolean> {
        return ctx.options.type === BuiltInPolicyType.COMPOSITE;
    }

    async evaluate(ctx: PolicyEvaluatorContext<CompositePolicyOptions, C>): Promise<boolean> {
        let count = 0;

        for (let i = 0; i < ctx.options.children.length; i++) {
            const childPolicy = ctx.options.children[i];
            let outcome : boolean;

            if (isCompositePolicy(childPolicy)) {
                outcome = await this.evaluate({
                    ...ctx,
                    options: childPolicy,
                });
            } else {
                if (typeof ctx.evaluators === 'undefined') {
                    throw PolicyError.evaluatorNotFound(childPolicy.type);
                }

                outcome = await evaluatePolicy(childPolicy, ctx.data || {}, ctx.evaluators);
            }

            if (outcome) {
                if (ctx.options.decisionStrategy === DecisionStrategy.AFFIRMATIVE) {
                    return maybeInvertPolicyOutcome(true, ctx.options.invert);
                }

                count++;
            } else {
                if (ctx.options.decisionStrategy === DecisionStrategy.UNANIMOUS) {
                    return maybeInvertPolicyOutcome(false, ctx.options.invert);
                }

                count--;
            }
        }

        return maybeInvertPolicyOutcome(count > 0, ctx.options.invert);
    }
}
