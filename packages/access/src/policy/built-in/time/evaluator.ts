/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { BuiltInPolicyType } from '../constants';
import { isIntervalForDayOfMonth, isIntervalForDayOfWeek, isIntervalForDayOfYear } from './helpers';
import { TimePolicyValidator } from './validator';

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

function normalizeDate(input: Date, dateRef?: Date) {
    const date = dateRef ? new Date(dateRef) : new Date();
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
            const date = dateRef ? new Date(dateRef) : new Date();
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

export class TimePolicyEvaluator implements IPolicyEvaluator {
    protected validator : TimePolicyValidator;

    constructor() {
        this.validator = new TimePolicyValidator();
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        let now : Date;

        if (ctx.data.has(BuiltInPolicyType.TIME)) {
            if (ctx.data.isValidated(BuiltInPolicyType.TIME)) {
                now = ctx.data.get<Date>(BuiltInPolicyType.TIME);
            } else {
                // todo: run validator on attributes (isObject ...)
                now = toDate(ctx.data.get(BuiltInPolicyType.TIME));

                ctx.data.set(BuiltInPolicyType.TIME, now);
                ctx.data.setValidated(BuiltInPolicyType.TIME);
            }
        } else {
            now = new Date();
        }

        if (policy.start) {
            const start = normalizeDate(toDate(policy.start, now), now);
            if (now < start) {
                return {
                    success: maybeInvertPolicyOutcome(false, policy.invert),
                };
            }
        }

        if (policy.end) {
            const end = normalizeDate(toDate(policy.end, now), now);
            if (now > end) {
                return {
                    success: maybeInvertPolicyOutcome(false, policy.invert),
                };
            }
        }

        if (policy.interval) {
            if (
                isIntervalForDayOfWeek(policy.interval) &&
                policy.dayOfWeek
            ) {
                if (now.getDay() !== policy.dayOfWeek) {
                    return {
                        success: maybeInvertPolicyOutcome(false, policy.invert),
                    };
                }
            }

            if (
                isIntervalForDayOfMonth(policy.interval) &&
                policy.dayOfMonth
            ) {
                if (now.getDate() !== policy.dayOfMonth) {
                    return {
                        success: maybeInvertPolicyOutcome(false, policy.invert),
                    };
                }
            }

            if (
                isIntervalForDayOfYear(policy.interval) &&
                policy.dayOfYear
            ) {
                const start = new Date(now.getFullYear(), 0, 0);
                const diff = (now.getTime() - start.getTime()) +
                    ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);

                const oneDay = 1000 * 60 * 60 * 24;
                const dayOfYear = Math.floor(diff / oneDay);

                if (dayOfYear !== policy.dayOfYear) {
                    return {
                        success: maybeInvertPolicyOutcome(false, policy.invert),
                    };
                }
            }
        }

        return {
            success: maybeInvertPolicyOutcome(true, policy.invert),
        };
    }
}
