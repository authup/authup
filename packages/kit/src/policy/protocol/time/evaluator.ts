/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AnyPolicy, PolicyEvaluationContext, PolicyEvaluator,
} from '../../types';
import { invertPolicyOutcome } from '../../utils';
import { isTimePolicy } from './helper';
import type { TimePolicyOptions } from './types';

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function normalizeDate(input: Date, dateRef?: Date) {
    const date = new Date(dateRef);
    date.setHours(input.getHours(), input.getMinutes());

    return date;
}

function toDate(
    input: Date | string | number,
    dateRef?: Date,
) : Date {
    if (typeof input === 'string') {
        if (timeRegex.test(input)) {
            const [startHours, startMinutes] = input.split(':').map(Number);
            const date = new Date(dateRef);
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

export class TimePolicyEvaluator implements PolicyEvaluator<TimePolicyOptions> {
    try(policy: AnyPolicy, context: PolicyEvaluationContext): boolean {
        if (!isTimePolicy(policy)) {
            return false;
        }

        return this.execute(policy, context);
    }

    execute(policy: TimePolicyOptions, context: PolicyEvaluationContext): boolean {
        let now : Date;
        if (context.dateTime) {
            now = toDate(context.dateTime);
        } else {
            now = new Date();
        }

        if (policy.start) {
            const start = normalizeDate(toDate(policy.start, now), now);

            if (now < start) {
                return invertPolicyOutcome(false, policy.invert);
            }
        }

        if (policy.end) {
            const end = normalizeDate(toDate(policy.end, now), now);
            if (now > end) {
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
