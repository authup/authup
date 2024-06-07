/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributesPolicyEvalContext } from '../../../src';
import { evalAttributesPolicy } from '../../../src';

type User = {
    name: string,
    age: number
};

describe('src/policy/attributes', () => {
    it('should restrict', () => {
        const policy : AttributesPolicyEvalContext<User> = {
            invert: false,
            conditions: {
                name: {
                    $regex: /t/,
                },
                age: {
                    $lt: 18,
                    $gt: 12,
                },
            },
        };

        let outcome = evalAttributesPolicy(policy);
        expect(outcome).toBeTruthy();

        outcome = evalAttributesPolicy(policy, {
            name: 'Peter',
            age: 15,
        });
        expect(outcome).toBeTruthy();

        outcome = evalAttributesPolicy(policy, {
            name: 'Peter',
            age: 28,
        });
        expect(outcome).toBeFalsy();
    });
});
