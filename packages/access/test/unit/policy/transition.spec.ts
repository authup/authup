/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { DecisionStrategy } from '@authup/kit';
import type { DatePolicy, TimePolicy } from '../../../src';
import {
    BuiltInPolicyType,
    DatePolicyEvaluator,
    PermissionEvaluator,
    PermissionMemoryProvider,
    PolicyDefaultEvaluators,
    PolicyEngine,
    TimePolicyEvaluator,
    createPolicyTransitionCollector,
    definePolicyData,
    definePolicyEvaluationContext,
    definePolicyWithType,
} from '../../../src';

// Wednesday, 2024-04-17, local time.
const at = (hours: number, minutes = 0) => new Date(2024, 3, 17, hours, minutes);
const nextMidnight = new Date(2024, 3, 18);

async function timeTransition(policy: TimePolicy) {
    const collector = createPolicyTransitionCollector();
    await new TimePolicyEvaluator().evaluate(
        policy,
        definePolicyEvaluationContext({ transitions: collector }),
    );

    return collector.next;
}

async function dateTransition(policy: DatePolicy) {
    const collector = createPolicyTransitionCollector();
    await new DatePolicyEvaluator().evaluate(
        policy,
        definePolicyEvaluationContext({ transitions: collector }),
    );

    return collector.next;
}

describe('src/policy (clock transitions)', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('time', () => {
        const window : TimePolicy = { start: '08:00:00', end: '16:00:00' };

        it('should report the start while before the window', async () => {
            vi.setSystemTime(at(6));
            await expect(timeTransition(window)).resolves.toEqual(at(8));
        });

        it('should report the minute after the end while inside the window', async () => {
            vi.setSystemTime(at(12));
            await expect(timeTransition(window)).resolves.toEqual(at(16, 1));
        });

        // The evaluator compares at minute precision, so the seconds of the
        // evaluation must not leak into the reported instant.
        it('should report the instant the verdict actually flips, whatever the seconds of the evaluation', async () => {
            const evaluate = async (now: Date) => {
                vi.setSystemTime(now);
                const result = await new TimePolicyEvaluator().evaluate(window, definePolicyEvaluationContext());
                return result.success;
            };

            vi.setSystemTime(new Date(2024, 3, 17, 6, 0, 30, 200));
            await expect(timeTransition(window)).resolves.toEqual(at(8));
            await expect(evaluate(new Date(at(8).getTime() - 1))).resolves.toBe(false);
            await expect(evaluate(at(8))).resolves.toBe(true);

            vi.setSystemTime(new Date(2024, 3, 17, 12, 0, 30, 200));
            await expect(timeTransition(window)).resolves.toEqual(at(16, 1));
            await expect(evaluate(new Date(at(16, 1).getTime() - 1))).resolves.toBe(true);
            await expect(evaluate(at(16, 1))).resolves.toBe(false);
        });

        it('should report the next midnight after the window', async () => {
            vi.setSystemTime(at(17));
            await expect(timeTransition(window)).resolves.toEqual(nextMidnight);
        });

        it('should report the next midnight for a day-of-week check', async () => {
            vi.setSystemTime(at(12));
            await expect(timeTransition({ interval: 'weekly', dayOfWeek: 3 }))
                .resolves.toEqual(nextMidnight);
        });

        it('should not move the instant for an inverted policy', async () => {
            vi.setSystemTime(at(6));
            await expect(timeTransition({ ...window, invert: true })).resolves.toEqual(at(8));
        });

        it('should report nothing for an unconstrained policy', async () => {
            vi.setSystemTime(at(12));
            await expect(timeTransition({})).resolves.toBeUndefined();
        });

        it('should report nothing for a supplied time', async () => {
            vi.setSystemTime(at(12));

            const collector = createPolicyTransitionCollector();
            await new TimePolicyEvaluator().evaluate(
                window,
                definePolicyEvaluationContext({
                    data: definePolicyData({ [BuiltInPolicyType.TIME]: at(12) }),
                    transitions: collector,
                }),
            );

            expect(collector.next).toBeUndefined();
        });
    });

    describe('date', () => {
        const range : DatePolicy = {
            start: new Date(2024, 3, 20),
            end: new Date(2024, 3, 25),
        };

        it('should report the start day while before the range', async () => {
            vi.setSystemTime(at(12));
            await expect(dateTransition(range)).resolves.toEqual(new Date(2024, 3, 20));
        });

        it('should report the midnight after the end day while inside the range', async () => {
            vi.setSystemTime(new Date(2024, 3, 22, 12));
            await expect(dateTransition(range)).resolves.toEqual(new Date(2024, 3, 26));
        });

        it('should report nothing after the range', async () => {
            vi.setSystemTime(new Date(2024, 3, 27, 12));
            await expect(dateTransition(range)).resolves.toBeUndefined();
        });
    });

    it('should keep the earliest instant across a composite', async () => {
        vi.setSystemTime(at(6));

        const collector = createPolicyTransitionCollector();
        await new PolicyEngine(PolicyDefaultEvaluators).evaluate(
            definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                decisionStrategy: DecisionStrategy.UNANIMOUS,
                children: [
                    definePolicyWithType(BuiltInPolicyType.DATE, { start: new Date(2024, 3, 1) }),
                    definePolicyWithType(BuiltInPolicyType.TIME, { start: '08:00:00' }),
                ],
            }),
            definePolicyEvaluationContext({ transitions: collector }),
        );

        expect(collector.next).toEqual(at(8));
    });

    it('should reach a clock policy through the permission evaluator', async () => {
        vi.setSystemTime(at(6));

        const evaluator = new PermissionEvaluator({
            provider: new PermissionMemoryProvider([
                {
                    permission: { name: 'office_hours' },
                    policies: [
                        definePolicyWithType(BuiltInPolicyType.TIME, { start: '08:00:00', end: '16:00:00' }),
                    ],
                },
            ]),
            policyEngine: new PolicyEngine(PolicyDefaultEvaluators),
        });

        const collector = createPolicyTransitionCollector();
        await expect(evaluator.preEvaluate({
            name: 'office_hours',
            options: { transitions: collector },
        })).rejects.toThrow();

        expect(collector.next).toEqual(at(8));
    });
});
