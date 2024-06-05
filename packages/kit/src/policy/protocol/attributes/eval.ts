/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { guard } from '@ucast/mongo2js';
import { invertPolicyOutcome } from '../../utils';
import type { AttributesPolicyEvalContext } from './types';

export function evalPolicyAttributes(policy: AttributesPolicyEvalContext, input?: Record<string, any>): boolean {
    if (typeof input === 'undefined') {
        return invertPolicyOutcome(true, policy.invert);
    }

    const testIt = guard(policy.condition);
    return invertPolicyOutcome(testIt(input), policy.invert);
}
