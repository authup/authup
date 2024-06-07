/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyBase, PolicyEvaluator } from '../../types';
import { invertPolicyOutcome } from '../../utils';
import { isTimePolicy } from './helper';
import type { TimePolicyEvalContext } from './types';

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function normalizeDate(input: Date) {
    const date = new Date();
    date.setHours(input.getHours(), input.getMinutes());

    return date;
}

function toDate(input: Date | string | number) : Date {
    if (typeof input === 'string') {
        if (timeRegex.test(input)) {
            const [startHours, startMinutes] = input.split(':').map(Number);
            const date = new Date();
            date.setHours(startHours, startMinutes);
            return date;
        }

        return new Date(input);
    }

    if (typeof input === 'number') {
        return new Date(input);
    }

    return input;
}

export class TimePolicyEvaluator implements PolicyEvaluator<TimePolicyEvalContext> {
    try(policy: PolicyBase): boolean {
        if (!isTimePolicy(policy)) {
            return false;
        }

        return this.execute(policy);
    }

    execute(policy: TimePolicyEvalContext): boolean {
        const now = new Date();

        if (policy.start) {
            const start = normalizeDate(toDate(policy.start));

            if (now > start) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        if (policy.end) {
            const end = normalizeDate(toDate(policy.end));
            if (end < now) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        if (policy.dayOfWeek) {
            if (now.getDay() !== policy.dayOfWeek) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        if (policy.dayOfMonth) {
            if (now.getDate() !== policy.dayOfMonth) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        if (policy.dayOfYear) {
            const start = new Date(now.getFullYear(), 0, 0);
            const diff = (now.getTime() - start.getTime()) +
                ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);

            const oneDay = 1000 * 60 * 60 * 24;
            const dayOfYear = Math.floor(diff / oneDay);

            if (dayOfYear !== policy.dayOfYear) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        return invertPolicyOutcome(true, policy.invert);
    }
}
