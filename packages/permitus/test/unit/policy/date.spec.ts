/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DatePolicy, DatePolicyOptions } from '../../../src';
import {
    BuiltInPolicyType,
    DatePolicyEvaluator,
    parseDatePolicyOptions,
} from '../../../src';

describe('src/policy/date', () => {
    it('should restrict', async () => {
        const options : DatePolicy = {
            type: BuiltInPolicyType.DATE,
            start: '2024-04-01',
            end: '2024-05-01',
        };

        const evaluator = new DatePolicyEvaluator();
        const dateTime = new Date('2024-04-15');
        let outcome = await evaluator.evaluate({
            options,
            data: {
                dateTime,
            },
        });
        expect(outcome).toBeTruthy();

        // march
        dateTime.setMonth(2, 1);
        outcome = await evaluator.evaluate({
            options,
            data: {
                dateTime,
            },
        });
        expect(outcome).toBeFalsy();

        // june
        dateTime.setMonth(5, 1);
        outcome = await evaluator.evaluate({
            options,
            data: {
                dateTime,
            },
        });
        expect(outcome).toBeFalsy();
    });

    it('should parse options', () => {
        const output = parseDatePolicyOptions({
            start: '2024-01-01',
            end: '2024-05-01',
        } satisfies DatePolicyOptions);

        expect(output.start).toEqual('2024-01-01');
        expect(output.end).toEqual('2024-05-01');
    });

    it('should parse options with unknown', () => {
        const output = parseDatePolicyOptions({
            start: '2024-01-01',
            end: '2024-05-01',
            foo: 'bar',
        } satisfies DatePolicyOptions & { foo?: string }) as Partial<DatePolicyOptions> & { foo?: string };

        expect(output.start).toEqual('2024-01-01');
        expect(output.end).toEqual('2024-05-01');
        expect(output.foo).toBeUndefined();
    });
});
