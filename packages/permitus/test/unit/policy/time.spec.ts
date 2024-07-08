/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TimePolicy, TimePolicyOptions } from '../../../src';
import {
    BuiltInPolicyType,
    TimePolicyEvaluator, parseTimePolicyOptions,
} from '../../../src';

describe('src/policy/time', () => {
    it('should restrict', async () => {
        const options : TimePolicy = {
            type: BuiltInPolicyType.TIME,
            start: '08:00',
            end: '16:00',
        };

        const evaluator = new TimePolicyEvaluator();
        const dateTime = new Date();
        dateTime.setHours(12, 0);

        let outcome = await evaluator.evaluate({
            options,
            data: {
                dateTime,
            },
        });
        expect(outcome).toBeTruthy();

        dateTime.setHours(6, 0);
        outcome = await evaluator.evaluate({
            options,
            data: {
                dateTime,
            },
        });
        expect(outcome).toBeFalsy();
    });

    it('should parse options', () => {
        const output = parseTimePolicyOptions({
            start: '08:00',
            end: '16:00',
            interval: 'daily',
            dayOfWeek: 0,
            dayOfMonth: 1,
            dayOfYear: 1,
        } satisfies TimePolicyOptions);

        expect(output.start).toEqual('08:00');
        expect(output.end).toEqual('16:00');
        expect(output.interval).toEqual('daily');
        expect(output.dayOfWeek).toEqual(0);
        expect(output.dayOfMonth).toEqual(1);
        expect(output.dayOfYear).toEqual(1);
    });

    it('should parse options with unknown', () => {
        const output = parseTimePolicyOptions({
            start: '08:00',
            foo: 'bar',
        } satisfies TimePolicyOptions & { foo?: string }) as Partial<TimePolicyOptions> & { foo?: string };

        expect(output.start).toEqual('08:00');
        expect(output.foo).toBeUndefined();
    });
});
