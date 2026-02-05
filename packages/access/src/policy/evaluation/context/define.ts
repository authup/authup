/*
 * Copyright (c) 2026.
 *  Author Peter Placzek (tada5hi)
 *  For the full copyright and license information,
 *  view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationContext, PolicyEvaluationContextInput } from './types.ts';
import { PolicyData } from '../../data.ts';

export function definePolicyEvaluationContext(
    input: PolicyEvaluationContextInput = {},
) : PolicyEvaluationContext {
    return {
        evaluators: input.evaluators || {},
        path: input.path || [],
        data: input.data || new PolicyData(),
        include: input.include || [],
        exclude: input.exclude || [],
    };
}
