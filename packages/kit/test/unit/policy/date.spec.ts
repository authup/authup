/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { DatePolicy } from '../../../src';
import {
    BuiltInPolicyType,
    DatePolicyEvaluator,
} from '../../../src';

describe('src/policy/date', () => {
    it('should restrict', () => {
        const policy : DatePolicy = {
            type: BuiltInPolicyType.DATE,
            start: '2024-04-01',
            end: '2024-05-01',
        };

        const evaluator = new DatePolicyEvaluator();
        const dateTime = new Date('2024-04-15');
        let outcome = evaluator.execute(policy, {
            dateTime,
        });
        expect(outcome).toBeTruthy();

        // march
        dateTime.setMonth(2, 1);
        outcome = evaluator.execute(policy, {
            dateTime,
        });
        expect(outcome).toBeFalsy();

        // june
        dateTime.setMonth(5, 1);
        outcome = evaluator.execute(policy, {
            dateTime,
        });
        expect(outcome).toBeFalsy();
    });
});
