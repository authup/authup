/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { IPolicyEvaluator, PolicyEvaluationContext, PolicyEvaluationResult } from '../../evaluation';
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

/**
 * The next instant at which a date policy's verdict could change, seen from the
 * (day-normalized) `now`: the start day while it is still ahead, else the
 * midnight after the end day while that day has not passed. Nothing once the
 * end day is behind, since the verdict is final from then on.
 */
function nextDateTransition(policy: DatePolicy, now: Date) : Date | undefined {
    if (policy.start) {
        const start = normalizeDate(toDate(policy.start));
        if (now < start) {
            return start;
        }
    }

    if (policy.end) {
        const end = normalizeDate(toDate(policy.end));
        if (now <= end) {
            return new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1);
        }
    }

    return undefined;
}

export class DatePolicyEvaluator implements IPolicyEvaluator {
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

            // Only a verdict read off the real clock expires; a supplied date is fixed.
            if (ctx.transitions) {
                const next = nextDateTransition(policy, now);
                if (next) {
                    ctx.transitions.report(next);
                }
            }
        }

        if (policy.start) {
            const start = normalizeDate(toDate(policy.start));
            if (now < start) {
                return { success: maybeInvertPolicyOutcome(false, policy.invert) };
            }
        }

        if (policy.end) {
            const end = normalizeDate(toDate(policy.end));
            if (now > end) {
                return { success: maybeInvertPolicyOutcome(false, policy.invert) };
            }
        }

        return { success: maybeInvertPolicyOutcome(true, policy.invert) };
    }
}
