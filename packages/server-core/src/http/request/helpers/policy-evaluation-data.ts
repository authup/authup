/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluationData } from '@authup/permitus';
import type { Request } from 'routup';
import { generatePolicyIdentityByRequest } from './policy-identity';

export function buildPolicyEvaluationDataByRequest(
    req: Request,
    input: Partial<PolicyEvaluationData> = {},
) : PolicyEvaluationData {
    return {
        ...input,
        identity: generatePolicyIdentityByRequest(req),
    };
}
