/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributesPolicyOptions } from '../../../src';
import { AttributesPolicyEvaluator } from '../../../src';

type User = {
    name: string,
    age: number
};

const options : AttributesPolicyOptions<User> = {
    invert: false,
    query: {
        name: {
            $regex: /t/,
        },
        age: {
            $lt: 18,
            $gt: 12,
        },
    },
};

const evaluator = new AttributesPolicyEvaluator<User>();

describe('src/policy/attributes', () => {
    it('should succeed with successful predicates', async () => {
        const outcome = await evaluator.evaluate({
            options,
            data: {
                attributes: {
                    name: 'Peter',
                    age: 15,
                },
            },
        });
        expect(outcome).toBeTruthy();
    });

    it('should fail with missing context', async () => {
        await expect(evaluator.evaluate({ options })).rejects.toThrow();
    });

    it('should fail with invalid predicate value', async () => {
        const outcome = await evaluator.evaluate({
            options,
            data: {
                attributes: {
                    name: 'Peter',
                    age: 28,
                },
            },
        });
        expect(outcome).toBeFalsy();
    });
});
