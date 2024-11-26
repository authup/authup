/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { PolicyError } from '../error';
import { maybeInvertPolicyOutcome } from '../helpers';
import type { PolicyWithType } from '../types';
import type { PolicyEvaluateContext } from './types';

export async function evaluatePolicy(ctx: PolicyEvaluateContext<PolicyWithType>) : Promise<boolean> {
    if (
        ctx.options.exclude &&
        ctx.options.exclude.length > 0 &&
        ctx.options.exclude.indexOf(ctx.spec.type) !== -1
    ) {
        if (typeof ctx.spec.invert === 'boolean') {
            return maybeInvertPolicyOutcome(true, ctx.spec.invert);
        }

        return true;
    }

    if (
        ctx.options.include &&
        ctx.options.include.length > 0 &&
        ctx.options.include.indexOf(ctx.spec.type) === -1
    ) {
        if (typeof ctx.spec.invert === 'boolean') {
            return maybeInvertPolicyOutcome(true, ctx.spec.invert);
        }

        return true;
    }

    const evaluator = ctx.evaluators[ctx.spec.type];
    if (!evaluator) {
        throw PolicyError.evaluatorNotFound(ctx.spec.type);
    }

    try {
        const canEvaluate = await evaluator.can(ctx);
        if (canEvaluate) {
            const spec = await evaluator.validateSpecification(ctx);
            const data = await evaluator.validateData(ctx);

            return await evaluator.evaluate({
                ...ctx,
                data,
                spec,
            });
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
