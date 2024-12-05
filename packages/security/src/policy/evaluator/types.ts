/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyData, PolicyWithType } from '../types';

export type PolicyEvaluateContext<
    SPEC extends Record<string, any> = Record<string, any>,
    DATA extends PolicyData = PolicyData,
> = {
    spec: SPEC,
    data: DATA,
    evaluators: PolicyEvaluators
    options: PolicyEvaluateOptions
};

export type PolicyEvaluateContextInput<
    SPEC extends Record<string, any> = Record<string, any>,
    DATA extends PolicyData = PolicyData,
> = Omit<PolicyEvaluateContext<SPEC, DATA>, 'evaluators' | 'options'> &
Partial<Pick<PolicyEvaluateContext<SPEC, DATA>, 'evaluators' | 'options'>>;

export type PolicyEvaluateOptions = {
    include?: string[],
    exclude?: string[],
};

export type PolicyEvaluators = Record<string, PolicyEvaluator>;

export interface PolicyEvaluator<
    SPEC extends Record<string, any> = Record<string, any>,
    DATA extends Record<string, any> = Record<string, any>,
> {
    /**
     * Execute the evaluator with a given
     * evaluator context.
     *
     * @throws PolicyError
     * @param ctx
     */
    evaluate(ctx: PolicyEvaluateContext<SPEC, DATA>): Promise<boolean>;

    /**
     * Validate the specification.
     *
     * @throws PolicyError
     * @param ctx
     */
    validateSpecification(
        ctx: PolicyEvaluateContext<Record<string, any>, DATA>
    ) : Promise<SPEC>;

    /**
     * Validate the passed data.
     *
     * @param ctx
     */
    validateData(
        ctx: PolicyEvaluateContext<SPEC>
    ) : Promise<DATA>;

    /**
     * Verify if the evaluator (might) can hande the provided
     * evaluator context.
     *
     * @param ctx
     */
    can(ctx: PolicyEvaluateContext<PolicyWithType>): Promise<boolean>;
}
