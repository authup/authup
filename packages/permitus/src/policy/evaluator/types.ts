/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyWithType } from '../types';

export type PolicyEvaluatorContext<
    POLICY extends Record<string, any> = Record<string, any>,
    DATA extends Record<string, any> = Record<string, any>,
> = {
    policy: POLICY,
    data: DATA,
    evaluators?: PolicyEvaluators
};

export type PolicyEvaluators = Record<string, PolicyEvaluator>;

export interface PolicyEvaluator<
    OPTIONS extends Record<string, any> = Record<string, any>,
    DATA extends Record<string, any> = Record<string, any>,
> {
    /**
     * Execute the evaluator with a given
     * evaluator context.
     *
     * @throws PolicyError
     * @param ctx
     */
    evaluate(ctx: PolicyEvaluatorContext<OPTIONS, DATA>): Promise<boolean>;

    /**
     * Safe execute the evaluator with an unknown context.
     *
     * @throws PolicyError
     * @param ctx
     */
    safeEvaluate(ctx: PolicyEvaluatorContext) : Promise<boolean>;

    /**
     * Verify if the evaluator (might) can hande the provided
     * evaluator context.
     *
     * @param ctx
     */
    canEvaluate(ctx: PolicyEvaluatorContext<PolicyWithType>): Promise<boolean>;
}
