/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { invertPolicyOutcome } from '../../utils';
import type { TimePolicyEvalContext } from './types';

function toDate(input: Date | string | number) : Date {
    if (typeof input === 'string') {
        return new Date(input);
    }

    if (typeof input === 'number') {
        return new Date(input);
    }

    return input;
}

export function evalPolicyTime(
    policy: TimePolicyEvalContext,
): boolean {
    if (policy.notBefore) {
        const notBefore = toDate(policy.notBefore);

        if (notBefore.getTime() > Date.now()) {
            return invertPolicyOutcome(false, policy.invert);
        }
    }

    if (policy.notAfter) {
        const notAfter = toDate(policy.notAfter);
        if (notAfter.getTime() < Date.now()) {
            return invertPolicyOutcome(false, policy.invert);
        }
    }

    return invertPolicyOutcome(true, policy.invert);
}
