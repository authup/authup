/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluator';
import { maybeInvertPolicyOutcome } from '../../helpers';
import { BuiltInPolicyType } from '../constants.ts';
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

export class DatePolicyEvaluator implements IPolicyEvaluator<DatePolicy> {
    protected validator : DatePolicyValidator;

    constructor() {
        this.validator = new DatePolicyValidator();
    }

    async evaluate(value: Record<string, any>, ctx: PolicyEvaluationContext): Promise<PolicyEvaluationResult> {
        // todo: catch errors + transform to issue(s)
        const policy = await this.validator.run(value);

        let now : Date;

        if (ctx.data.has(BuiltInPolicyType.DATE)) {
            if (ctx.data.isValidated(BuiltInPolicyType.DATE)) {
                now = ctx.data.get<Date>(BuiltInPolicyType.DATE);
            } else {
                // todo: run validator on attributes (isObject ...)
                now = normalizeDate(toDate(ctx.data.get(BuiltInPolicyType.DATE)));

                ctx.data.set(BuiltInPolicyType.DATE, now);
                ctx.data.setValidated(BuiltInPolicyType.DATE);
            }
        } else {
            now = normalizeDate(new Date());
        }

        if (policy.start) {
            const start = normalizeDate(toDate(policy.start));
            if (now < start) {
                return maybeInvertPolicyOutcome(false, policy.invert);
            }
        }

        if (policy.end) {
            const end = normalizeDate(toDate(policy.end));
            if (now > end) {
                return maybeInvertPolicyOutcome(false, policy.invert);
            }
        }

        return maybeInvertPolicyOutcome(true, policy.invert);
    }
}
