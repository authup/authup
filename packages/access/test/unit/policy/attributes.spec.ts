/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    AttributesPolicyEvaluator,
    AttributesPolicyValidator,
} from '../../../src';
import type { AttributesPolicy } from '../../../src';
import { buildTestPolicyEvaluateContext } from '../../utils';

type User = {
    name: string,
    age: number
};

const config : AttributesPolicy<User> = {
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
        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            config,
            input: {
                attributes: {
                    name: 'Peter',
                    age: 15,
                },
            },
        }));
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
        await expect(
            evaluator.evaluate(buildTestPolicyEvaluateContext({ config, input: {} })),
        ).rejects.toThrow();
    });

    it('should fail with invalid predicate value', async () => {
        const outcome = await evaluator.evaluate(buildTestPolicyEvaluateContext({
            config,
            input: {
                attributes: {
                    name: 'Peter',
                    age: 28,
                },
            },
        }));
        expect(outcome).toBeFalsy();
    });
});
