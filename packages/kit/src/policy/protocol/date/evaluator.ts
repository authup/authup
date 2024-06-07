/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyBase, PolicyEvaluator } from '../../types';
import { invertPolicyOutcome } from '../../utils';
import { isDatePolicy } from './helper';
import type { DatePolicyEvalContext } from './types';

function normalizeDate(input: Date) {
    return new Date(input.getFullYear(), input.getMonth(), input.getDate());
}

function toDate(input: Date | string | number) : Date {
    if (typeof input === 'string') {
        return new Date(input);
    }

    if (typeof input === 'number') {
        return new Date(input);
    }

    return input;
}

export class DatePolicyEvaluator implements PolicyEvaluator<DatePolicyEvalContext> {
    try(policy: PolicyBase): boolean {
        if (!isDatePolicy(policy)) {
            return false;
        }

        return this.execute(policy);
    }

    execute(policy: DatePolicyEvalContext): boolean {
        const now = normalizeDate(new Date());

        if (policy.start) {
            const start = normalizeDate(toDate(policy.start));
            if (start > now) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        if (policy.end) {
            const end = normalizeDate(toDate(policy.end));
            if (end < now) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        return invertPolicyOutcome(true, policy.invert);
    }
}
