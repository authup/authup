/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluateContext, PolicyEvaluator } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyInput, PolicyWithType } from '../../types';
import { BuiltInPolicyType } from '../constants';
import { isIntervalForDayOfMonth, isIntervalForDayOfWeek, isIntervalForDayOfYear } from './helpers';
import type { TimePolicy } from './types';
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

export class TimePolicyEvaluator implements PolicyEvaluator<TimePolicy> {
    protected validator : TimePolicyValidator;

    constructor() {
        this.validator = new TimePolicyValidator();
    }

    async can(
        ctx: PolicyEvaluateContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.config.type === BuiltInPolicyType.TIME;
    }

    async validateConfig(ctx: PolicyEvaluateContext) : Promise<TimePolicy> {
        return this.validator.run(ctx.config);
    }

    async validateInput(ctx: PolicyEvaluateContext<TimePolicy>) : Promise<PolicyInput> {
        return ctx.input;
    }

    async evaluate(ctx: PolicyEvaluateContext<TimePolicy>): Promise<boolean> {
        let now : Date;
        if (ctx.input.dateTime) {
            now = toDate(ctx.input.dateTime);
        } else {
            now = new Date();
        }

        if (ctx.config.start) {
            const start = normalizeDate(toDate(ctx.config.start, now), now);
            if (now < start) {
                return maybeInvertPolicyOutcome(false, ctx.config.invert);
            }
        }

        if (ctx.config.end) {
            const end = normalizeDate(toDate(ctx.config.end, now), now);
            if (now > end) {
                return maybeInvertPolicyOutcome(false, ctx.config.invert);
            }
        }

        if (ctx.config.interval) {
            if (
                isIntervalForDayOfWeek(ctx.config.interval) &&
                ctx.config.dayOfWeek
            ) {
                if (now.getDay() !== ctx.config.dayOfWeek) {
                    return maybeInvertPolicyOutcome(false, ctx.config.invert);
                }
            }

            if (
                isIntervalForDayOfMonth(ctx.config.interval) &&
                ctx.config.dayOfMonth
            ) {
                if (now.getDate() !== ctx.config.dayOfMonth) {
                    return maybeInvertPolicyOutcome(false, ctx.config.invert);
                }
            }

            if (
                isIntervalForDayOfYear(ctx.config.interval) &&
                ctx.config.dayOfYear
            ) {
                const start = new Date(now.getFullYear(), 0, 0);
                const diff = (now.getTime() - start.getTime()) +
                    ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);

                const oneDay = 1000 * 60 * 60 * 24;
                const dayOfYear = Math.floor(diff / oneDay);

                if (dayOfYear !== ctx.config.dayOfYear) {
                    return maybeInvertPolicyOutcome(false, ctx.config.invert);
                }
            }
        }

        return maybeInvertPolicyOutcome(true, ctx.config.invert);
    }
}
