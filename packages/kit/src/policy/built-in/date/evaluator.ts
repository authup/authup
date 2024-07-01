/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
import { invertPolicyOutcome } from '../../utils';
import { isAttributesPolicy } from '../attributes';
import type { DatePolicyOptions } from './types';

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

export class DatePolicyEvaluator implements PolicyEvaluator<DatePolicyOptions> {
    async canEvaluate(
        ctx: PolicyEvaluatorContext<any, any>,
    ) : Promise<boolean> {
        return isAttributesPolicy(ctx.options);
    }

    async evaluate(ctx: PolicyEvaluatorContext<DatePolicyOptions>) : Promise<boolean> {
        let now : Date;
        if (ctx.data.dateTime) {
            now = normalizeDate(toDate(ctx.data.dateTime));
        } else {
            now = normalizeDate(new Date());
        }

        if (ctx.options.start) {
            const start = normalizeDate(toDate(ctx.options.start));
            if (now < start) {
                return invertPolicyOutcome(false, ctx.options.invert);
            }
        }

        if (ctx.options.end) {
            const end = normalizeDate(toDate(ctx.options.end));
            if (now > end) {
                return invertPolicyOutcome(false, ctx.options.invert);
            }
        }

        return invertPolicyOutcome(true, ctx.options.invert);
    }
}
