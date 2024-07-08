/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { deserialize, serialize } from '@authup/kit';
import type { AttributesPolicyOptions } from '../../../src';
import {
    AttributesPolicyEvaluator, parseAttributesOptions,
} from '../../../src';

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

    it('should succeed with serialized/deserialized predicates', async () => {
        const value = deserialize(serialize(options));
        const outcome = await evaluator.evaluate({
            options: value,
            data: {
                attributes: {
                    name: 'Peter',
                    age: 15,
                },
            },
        });
        expect(outcome).toBeTruthy();
    });

    it('should parse options', () => {
        const output = parseAttributesOptions({
            query: {
                name: {
                    $eq: 'admin',
                },
            },
        } satisfies AttributesPolicyOptions);

        expect(output.query).toBeDefined();
    });

    it('should parse options with unknown', () => {
        const output = parseAttributesOptions({
            query: {
                name: {
                    $eq: 'admin',
                },
            },
            foo: 'bar',
        } satisfies AttributesPolicyOptions & { foo?: string }) as Partial<AttributesPolicyOptions> & { foo?: string };

        expect(output.query).toBeDefined();
        expect(output.foo).toBeUndefined();
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
