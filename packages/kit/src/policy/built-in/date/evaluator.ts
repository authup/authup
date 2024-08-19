/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { PolicyEvaluator, PolicyEvaluatorContext } from '../../evaluator';
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

    async canEvaluate(
        ctx: PolicyEvaluatorContext<PolicyWithType>,
    ) : Promise<boolean> {
        return ctx.policy.type === BuiltInPolicyType.DATE;
    }

    async safeEvaluate(ctx: PolicyEvaluatorContext) : Promise<boolean> {
        const policy = await this.validator.run(ctx.policy);

        return this.evaluate({
            ...ctx,
            policy,
        });
    }

    async evaluate(ctx: PolicyEvaluatorContext<DatePolicy, PolicyData>) : Promise<boolean> {
        let now : Date;
        if (ctx.data.dateTime) {
            now = normalizeDate(toDate(ctx.data.dateTime));
        } else {
            now = normalizeDate(new Date());
        }

        if (ctx.policy.start) {
            const start = normalizeDate(toDate(ctx.policy.start));
            if (now < start) {
                return maybeInvertPolicyOutcome(false, ctx.policy.invert);
            }
        }

        if (ctx.policy.end) {
            const end = normalizeDate(toDate(ctx.policy.end));
            if (now > end) {
                return maybeInvertPolicyOutcome(false, ctx.policy.invert);
            }
        }

        return maybeInvertPolicyOutcome(true, ctx.policy.invert);
    }
}
