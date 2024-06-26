/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { TimePolicy } from '../../../src';
import {
    BuiltInPolicyType, TimePolicyEvaluator,
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
});
