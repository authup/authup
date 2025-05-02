/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluateContext, PolicyInput } from '../../src';

type Input<
    S extends Record<string, any>,
    D extends PolicyInput = PolicyInput,
> = Omit<PolicyEvaluateContext<S, D>, 'evaluators' | 'options'> &
Partial<Pick<PolicyEvaluateContext<S, D>, 'evaluators' | 'options'>>;

export function buildTestPolicyEvaluateContext<
    S extends Record<string, any>,
    D extends PolicyInput = PolicyInput,
>(
    input: Input<S, D>,
) : PolicyEvaluateContext<S, D> {
    return {
        evaluators: {},
        options: {},
        ...input,
    };
}
