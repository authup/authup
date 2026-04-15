/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { TimePolicy } from '../../../src';
import {
    BuiltInPolicyType,
    PolicyData,
    TimePolicyEvaluator,
    TimePolicyValidator,
    definePolicyEvaluationContext,
} from '../../../src';

describe('src/policy/time', () => {
    it('should restrict', async () => {
        const config: TimePolicy = {
            start: '08:00:00',
            end: '16:00:00',
        };

        const evaluator = new TimePolicyEvaluator();
        const time = new Date();
        time.setHours(12, 0);

        let outcome = await evaluator.evaluate(
            config,
            definePolicyEvaluationContext({ data: new PolicyData({ [BuiltInPolicyType.TIME]: time }) }),
        );
        expect(outcome.success)
            .toBeTruthy();

        time.setHours(6, 0);
        outcome = await evaluator.evaluate(
            config,
            definePolicyEvaluationContext({ data: new PolicyData({ [BuiltInPolicyType.TIME]: time }) }),
        );
        expect(outcome.success)
            .toBeFalsy();
    });

    it('should parse options', async () => {
        const validator = new TimePolicyValidator();
        const output = await validator.run({
            start: '08:00:00',
            end: '16:00:00',
            interval: 'daily',
            day_of_week: 0,
            day_of_month: 1,
            day_of_year: 1,
        } satisfies TimePolicy);

        expect(output.start)
            .toEqual('08:00:00');
        expect(output.end)
            .toEqual('16:00:00');
        expect(output.interval)
            .toEqual('daily');
        expect(output.day_of_week)
            .toEqual(0);
        expect(output.day_of_month)
            .toEqual(1);
        expect(output.day_of_year)
            .toEqual(1);
    });

    it('should parse options with unknown', async () => {
        const validator = new TimePolicyValidator();
        const output = await validator.run({
            start: '08:00:00',
            foo: 'bar',
        } satisfies TimePolicy & { foo?: string }) as Partial<TimePolicy> & { foo?: string };

        expect(output.start)
            .toEqual('08:00:00');
        expect(output.foo)
            .toBeUndefined();
    });
});
