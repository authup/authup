/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DatePolicy } from '../../../src';
import {
    DatePolicyEvaluator,
    DatePolicyValidator,
} from '../../../src';
import { buildTestPolicyEvaluateContext } from '../../utils';

describe('src/policy/date', () => {
    it('should restrict', async () => {
        const spec : DatePolicy = {
            start: '2024-04-01',
            end: '2024-05-01',
        };

        const evaluator = new DatePolicyEvaluator();
        const dateTime = new Date('2024-04-15');
        let outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                dateTime,
            },
        }));
        expect(outcome).toBeTruthy();

        // march
        dateTime.setMonth(2, 1);
        outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                dateTime,
            },
        }));
        expect(outcome).toBeFalsy();

        // june
        dateTime.setMonth(5, 1);
        outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            spec,
            data: {
                dateTime,
            },
        }));
        expect(outcome).toBeFalsy();
    });

    it('should parse options', async () => {
        const validator = new DatePolicyValidator();
        const output = await validator.run({
            start: '2024-01-01',
            end: '2024-05-01',
        } satisfies DatePolicy);

        expect(output.start).toEqual('2024-01-01');
        expect(output.end).toEqual('2024-05-01');
    });

    it('should parse options with unknown', async () => {
        const validator = new DatePolicyValidator();
        const output = await validator.run({
            start: '2024-01-01',
            end: '2024-05-01',
            foo: 'bar',
        } satisfies DatePolicy & { foo?: string }) as Partial<DatePolicy> & { foo?: string };

        expect(output.start).toEqual('2024-01-01');
        expect(output.end).toEqual('2024-05-01');
        expect(output.foo).toBeUndefined();
    });
});
