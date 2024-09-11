/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TimePolicy } from '../../../src';
import {
    TimePolicyEvaluator,
    TimePolicyValidator,
} from '../../../src';
import { buildTestPolicyEvaluateContext } from '../../utils';

describe('src/policy/time', () => {
    it('should restrict', async () => {
        const spec: TimePolicy = {
            start: '08:00',
            end: '16:00',
        };

        const evaluator = new TimePolicyEvaluator();
        const dateTime = new Date();
        dateTime.setHours(12, 0);

        let outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                dateTime,
            },
        }));
        expect(outcome)
            .toBeTruthy();

        dateTime.setHours(6, 0);
        outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                dateTime,
            },
        }));
        expect(outcome)
            .toBeFalsy();
    });

    it('should parse options', async () => {
        const validator = new TimePolicyValidator();
        const output = await validator.run({
            start: '08:00',
            end: '16:00',
            interval: 'daily',
            dayOfWeek: 0,
            dayOfMonth: 1,
            dayOfYear: 1,
        } satisfies TimePolicy);

        expect(output.start)
            .toEqual('08:00');
        expect(output.end)
            .toEqual('16:00');
        expect(output.interval)
            .toEqual('daily');
        expect(output.dayOfWeek)
            .toEqual(0);
        expect(output.dayOfMonth)
            .toEqual(1);
        expect(output.dayOfYear)
            .toEqual(1);
    });

    it('should parse options with unknown', async () => {
        const validator = new TimePolicyValidator();
        const output = await validator.run({
            start: '08:00',
            foo: 'bar',
        } satisfies TimePolicy & { foo?: string }) as Partial<TimePolicy> & { foo?: string };

        expect(output.start)
            .toEqual('08:00');
        expect(output.foo)
            .toBeUndefined();
    });
});
