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
        ctx.options.exclude.indexOf(ctx.config.type) !== -1
    ) {
        if (typeof ctx.config.invert === 'boolean') {
            return maybeInvertPolicyOutcome(true, ctx.config.invert);
        }

        return true;
    }

    if (
        ctx.options.include &&
        ctx.options.include.length > 0 &&
        ctx.options.include.indexOf(ctx.config.type) === -1
    ) {
        if (typeof ctx.config.invert === 'boolean') {
            return maybeInvertPolicyOutcome(true, ctx.config.invert);
        }

        return true;
    }

    const evaluator = ctx.evaluators[ctx.config.type];
    if (!evaluator) {
        throw PolicyError.evaluatorNotFound(ctx.config.type);
    }

    try {
        const canEvaluate = await evaluator.can(ctx);
        if (canEvaluate) {
            const config = await evaluator.validateConfig(ctx);
            const input = await evaluator.validateInput(ctx);

            return await evaluator.evaluate({
                ...ctx,
                input,
                config,
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
