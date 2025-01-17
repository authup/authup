/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluateContext, PolicyEvaluator } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import type { PolicyData, PolicyWithType } from '../../types';
import { BuiltInPolicyType } from '../constants';
import type { DatePolicy } from './types';
import { DatePolicyValidator } from './validator';

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

export class DatePolicyEvaluator implements PolicyEvaluator<DatePolicy> {
    protected validator : DatePolicyValidator;

    constructor() {
        this.validator = new DatePolicyValidator();
    }

    async can(
        ctx: PolicyEvaluateContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.spec.type === BuiltInPolicyType.DATE;
    }

    async validateSpecification(ctx: PolicyEvaluateContext) : Promise<DatePolicy> {
        return this.validator.run(ctx.spec);
    }

    async validateData(ctx: PolicyEvaluateContext<DatePolicy>) : Promise<PolicyData> {
        return ctx.data;
    }

    async evaluate(ctx: PolicyEvaluateContext<DatePolicy>) : Promise<boolean> {
        let now : Date;
        if (ctx.data.dateTime) {
            now = normalizeDate(toDate(ctx.data.dateTime));
        } else {
            now = normalizeDate(new Date());
        }

        if (ctx.spec.start) {
            const start = normalizeDate(toDate(ctx.spec.start));
            if (now < start) {
                return maybeInvertPolicyOutcome(false, ctx.spec.invert);
            }
        }

        if (ctx.spec.end) {
            const end = normalizeDate(toDate(ctx.spec.end));
            if (now > end) {
                return maybeInvertPolicyOutcome(false, ctx.spec.invert);
            }
        }

        return maybeInvertPolicyOutcome(true, ctx.spec.invert);
    }
}
