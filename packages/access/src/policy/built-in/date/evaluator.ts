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
        return ctx.config.type === BuiltInPolicyType.DATE;
    }

    async validateConfig(ctx: PolicyEvaluateContext) : Promise<DatePolicy> {
        return this.validator.run(ctx.config);
    }

    async validateInput(ctx: PolicyEvaluateContext<DatePolicy>) : Promise<PolicyInput> {
        return ctx.input;
    }

    async evaluate(ctx: PolicyEvaluateContext<DatePolicy>) : Promise<boolean> {
        let now : Date;
        if (ctx.input.dateTime) {
            now = normalizeDate(toDate(ctx.input.dateTime));
        } else {
            now = normalizeDate(new Date());
        }

        if (ctx.config.start) {
            const start = normalizeDate(toDate(ctx.config.start));
            if (now < start) {
                return maybeInvertPolicyOutcome(false, ctx.config.invert);
            }
        }

        if (ctx.config.end) {
            const end = normalizeDate(toDate(ctx.config.end));
            if (now > end) {
                return maybeInvertPolicyOutcome(false, ctx.config.invert);
            }
        }

        return maybeInvertPolicyOutcome(true, ctx.config.invert);
    }
}
