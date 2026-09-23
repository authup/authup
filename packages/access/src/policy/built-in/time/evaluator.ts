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
            const parts = input.split(':');

            const startHours = Number(parts[0]);
            const startMinutes = Number(parts[1]);
            const startSeconds = parts[2] !== undefined ? Number(parts[2]) : 0;

            if (
                Number.isFinite(startHours) &&
                Number.isFinite(startMinutes) &&
                Number.isFinite(startSeconds)
            ) {
                const date = dateRef ? new Date(dateRef) : new Date();
                date.setHours(startHours, startMinutes, startSeconds, 0);

                return date;
            }
        }

        return new Date(input);
    }

    if (typeof input === 'number') {
        return new Date(input);
    }

    return input;
}

/**
 * The next instant at which a time policy's verdict could change, seen from
 * `now`: today's start while it is ahead, the minute after today's end while
 * that is ahead, and the next local midnight, where the daily window moves on
 * and the day-of-week/month/year checks roll over. The earliest of those; a
 * policy with no constraint never changes.
 *
 * `normalizeDate` keeps the seconds and milliseconds of the instant it is
 * evaluated at and drops the policy's own, so the comparisons below are made
 * at minute precision: `now < start` stops holding at HH:MM:00.000 of the
 * start, and `now > end` starts holding at the following minute. Reading the
 * candidates off `normalizeDate` instead would report the seconds of this
 * evaluation, up to a minute after the verdict already flipped.
 */
function nextTimeTransition(policy: TimePolicy, now: Date) : Date | undefined {
    const candidates : Date[] = [];
    const atMinute = (input: Date) => new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        input.getHours(),
        input.getMinutes(),
    );

    if (policy.start) {
        candidates.push(atMinute(toDate(policy.start, now)));
    }

    if (policy.end) {
        // One minute of ELAPSED time after the end, not the local wall-clock
        // minute after it: on a DST fall-back day the end can sit just before
        // the repeated hour, and `H:(M+1)` then names the second occurrence of
        // that hour while the evaluator already flips after the first one.
        candidates.push(new Date(atMinute(toDate(policy.end, now)).getTime() + 60_000));
    }

    if (policy.start || policy.end || policy.interval) {
        candidates.push(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
    }

    let next : Date | undefined;
    for (const candidate of candidates) {
        if (
            candidate.getTime() > now.getTime() &&
            (!next || candidate.getTime() < next.getTime())
        ) {
            next = candidate;
        }
    }

    return next;
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

            // Only a verdict read off the real clock expires; a supplied time is fixed.
            if (ctx.transitions) {
                const next = nextTimeTransition(policy, now);
                if (next) {
                    ctx.transitions.report(next);
                }
            }
        }

        if (policy.start) {
            const start = normalizeDate(toDate(policy.start, now), now);
            if (now < start) {
                return { success: maybeInvertPolicyOutcome(false, policy.invert) };
            }
        }

        if (policy.end) {
            const end = normalizeDate(toDate(policy.end, now), now);
            if (now > end) {
                return { success: maybeInvertPolicyOutcome(false, policy.invert) };
            }
        }

        if (policy.interval) {
            if (
                isIntervalForDayOfWeek(policy.interval) &&
                policy.dayOfWeek
            ) {
                if (now.getDay() !== policy.dayOfWeek) {
                    return { success: maybeInvertPolicyOutcome(false, policy.invert) };
                }
            }

            if (
                isIntervalForDayOfMonth(policy.interval) &&
                policy.dayOfMonth
            ) {
                if (now.getDate() !== policy.dayOfMonth) {
                    return { success: maybeInvertPolicyOutcome(false, policy.invert) };
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
                    return { success: maybeInvertPolicyOutcome(false, policy.invert) };
                }
            }
        }

        return { success: maybeInvertPolicyOutcome(true, policy.invert) };
    }
}
