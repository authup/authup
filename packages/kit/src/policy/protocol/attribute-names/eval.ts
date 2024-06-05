/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { invertPolicyOutcome } from '../../utils';
import type { AttributeNamesPolicyEvalContext } from './types';

export function evalPolicyAttributeNames(
    policy: AttributeNamesPolicyEvalContext,
    input?: Record<string, any>,
): boolean {
    if (typeof input === 'undefined') {
        return invertPolicyOutcome(true, policy.invert);
    }

    const keys = Object.keys(input);
    for (let i = 0; i < keys.length; i++) {
        const index = policy.names.indexOf(keys[i]);
        if (index === -1) {
            return invertPolicyOutcome(false, policy.invert);
        }
    }

    return invertPolicyOutcome(true, policy.invert);
}
