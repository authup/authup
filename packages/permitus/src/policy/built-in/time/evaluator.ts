/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { isObject } from 'smob';
import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../utils';
import { isAttributesPolicy } from '../attributes';
import type { TimePolicyOptions } from './types';

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

export class TimePolicyEvaluator implements PolicyEvaluator<TimePolicyOptions> {
    async canEvaluate(
        ctx: PolicyEvaluatorContext<any, any>,
    ) : Promise<boolean> {
        return isAttributesPolicy(ctx.options);
    }

    async evaluate(ctx: PolicyEvaluatorContext<TimePolicyOptions>): Promise<boolean> {
        let now : Date;
        if (
            isObject(ctx.data) &&
            ctx.data.dateTime
        ) {
            now = toDate(ctx.data.dateTime);
        } else {
            now = new Date();
        }

        if (ctx.options.start) {
            const start = normalizeDate(toDate(ctx.options.start, now), now);

            if (now < start) {
                return maybeInvertPolicyOutcome(false, ctx.options.invert);
            }
        }

        if (ctx.options.end) {
            const end = normalizeDate(toDate(ctx.options.end, now), now);
            if (now > end) {
                return maybeInvertPolicyOutcome(false, ctx.options.invert);
            }
        }

        if (ctx.options.dayOfWeek) {
            if (now.getDay() !== ctx.options.dayOfWeek) {
                return maybeInvertPolicyOutcome(false, ctx.options.invert);
            }
        }

        if (ctx.options.dayOfMonth) {
            if (now.getDate() !== ctx.options.dayOfMonth) {
                return maybeInvertPolicyOutcome(false, ctx.options.invert);
            }
        }

        if (ctx.options.dayOfYear) {
            const start = new Date(now.getFullYear(), 0, 0);
            const diff = (now.getTime() - start.getTime()) +
                ((start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000);

            const oneDay = 1000 * 60 * 60 * 24;
            const dayOfYear = Math.floor(diff / oneDay);

            if (dayOfYear !== ctx.options.dayOfYear) {
                return maybeInvertPolicyOutcome(false, ctx.options.invert);
            }
        }

        return maybeInvertPolicyOutcome(true, ctx.options.invert);
    }
}
