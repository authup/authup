/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyInput, PolicyWithType } from '../types';

export type PolicyEvaluateContext<
    CONFIG extends Record<string, any> = Record<string, any>,
    INPUT extends PolicyInput = PolicyInput,
> = {
    config: CONFIG,
    input: INPUT,
    evaluators: PolicyEvaluators
    options: PolicyEvaluateOptions
};

export type PolicyEvaluateContextInput<
    SPEC extends Record<string, any> = Record<string, any>,
    DATA extends PolicyInput = PolicyInput,
> = Omit<PolicyEvaluateContext<SPEC, DATA>, 'evaluators' | 'options'> &
Partial<Pick<PolicyEvaluateContext<SPEC, DATA>, 'evaluators' | 'options'>>;

export type PolicyEvaluateOptions = {
    include?: string[],
    exclude?: string[],
};

export type PolicyEvaluators = Record<string, PolicyEvaluator>;

export interface PolicyEvaluator<
    CONFIG extends Record<string, any> = Record<string, any>,
    INPUT extends Record<string, any> = Record<string, any>,
> {
    /**
     * Execute the evaluator with a given
     * evaluator context.
     *
     * @throws PolicyError
     * @param ctx
     */
    evaluate(ctx: PolicyEvaluateContext<CONFIG, INPUT>): Promise<boolean>;

    /**
     * Validate the configuration for the policy.
     *
     * @throws PolicyError
     * @param ctx
     */
    validateConfig(
        ctx: PolicyEvaluateContext<Record<string, any>, INPUT>
    ) : Promise<CONFIG>;

    /**
     * Validate the passed input.
     *
     * @param ctx
     */
    validateInput(
        ctx: PolicyEvaluateContext<CONFIG>
    ) : Promise<INPUT>;

    /**
     * Verify if the evaluator (might) can hande the provided
     * evaluator context.
     *
     * @param ctx
     */
    can(ctx: PolicyEvaluateContext<PolicyWithType>): Promise<boolean>;
}
