/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyWithType } from '../../types';
import { BuiltInPolicyType } from '../constants';
import type { TimePolicy } from './types';
import { TimePolicyValidator } from './validator';

const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

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

    async canEvaluate(
        ctx: PolicyEvaluatorContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.policy.type === BuiltInPolicyType.TIME;
    }

    async safeEvaluate(ctx: PolicyEvaluatorContext) : Promise<boolean> {
        const policy = await this.validator.run(ctx.policy);

        return this.evaluate({
            ...ctx,
            policy,
        });
    }

    async evaluate(ctx: PolicyEvaluatorContext<TimePolicy>): Promise<boolean> {
        let now : Date;
        if (ctx.data.dateTime) {
            now = toDate(ctx.data.dateTime);
        } else {
            now = new Date();
        }

        if (ctx.policy.start) {
            const start = normalizeDate(toDate(ctx.policy.start, now), now);

            if (now < start) {
                return maybeInvertPolicyOutcome(false, ctx.policy.invert);
            }
        }

        if (ctx.policy.end) {
            const end = normalizeDate(toDate(ctx.policy.end, now), now);
            if (now > end) {
                return maybeInvertPolicyOutcome(false, ctx.policy.invert);
            }
        }

        if (ctx.policy.dayOfWeek) {
            if (now.getDay() !== ctx.policy.dayOfWeek) {
                return maybeInvertPolicyOutcome(false, ctx.policy.invert);
            }
        }

        if (ctx.policy.dayOfMonth) {
            if (now.getDate() !== ctx.policy.dayOfMonth) {
                return maybeInvertPolicyOutcome(false, ctx.policy.invert);
            }
        }

        if (ctx.policy.dayOfYear) {
            const start = new Date(now.getFullYear(), 0, 0);
            const diff = (now.getTime() - start.getTime()) +
                ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);

            const oneDay = 1000 * 60 * 60 * 24;
            const dayOfYear = Math.floor(diff / oneDay);

            if (dayOfYear !== ctx.policy.dayOfYear) {
                return maybeInvertPolicyOutcome(false, ctx.policy.invert);
            }
        }

        return maybeInvertPolicyOutcome(true, ctx.policy.invert);
    }
}
