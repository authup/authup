/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { deserialize, serialize } from '@authup/kit';
import type { AttributesPolicy } from '../../../src';
import {
    AttributesPolicyEvaluator,
    AttributesPolicyValidator,
} from '../../../src';

type User = {
    name: string,
    age: number
};

const policy : AttributesPolicy<User> = {
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
            policy,
            data: {
                attributes: {
                    name: 'Peter',
                    age: 15,
                },
            },
        });
        expect(outcome).toBeTruthy();
    });

    it('should succeed with serialized/deserialized predicates', async () => {
        const value = deserialize(serialize(policy));
        const outcome = await evaluator.evaluate({
            policy: value,
            data: {
                attributes: {
                    name: 'Peter',
                    age: 15,
                },
            },
        });
        expect(outcome).toBeTruthy();
    });

    it('should parse options', async () => {
        const validator = new AttributesPolicyValidator();
        const output = await validator.run({
            query: {
                name: {
                    $eq: 'admin',
                },
            },
        } satisfies AttributesPolicy);

        expect(output.query).toBeDefined();
    });

    it('should parse options with unknown', async () => {
        const validator = new AttributesPolicyValidator();
        const output = await validator.run({
            query: {
                name: {
                    $eq: 'admin',
                },
            },
            foo: 'bar',
        } satisfies AttributesPolicy & { foo?: string }) as Partial<AttributesPolicy> & { foo?: string };

        expect(output.query).toBeDefined();
        expect(output.foo).toBeUndefined();
    });

    it('should fail with missing context', async () => {
        await expect(evaluator.evaluate({ policy, data: {} })).rejects.toThrow();
    });

    it('should fail with invalid predicate value', async () => {
        const outcome = await evaluator.evaluate({
            policy,
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
