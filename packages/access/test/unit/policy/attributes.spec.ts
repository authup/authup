/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import {
    AttributesPolicyEvaluator,
    AttributesPolicyValidator, 
    PolicyData, 
    definePolicyEvaluationContext,
} from '../../../src';
import type { AttributesPolicy } from '../../../src';

type User = {
    name: string,
    age: number
};

const policy : AttributesPolicy<User> = {
    invert: false,
    query: {
        name: { $regex: /t/ },
        age: {
            $lt: 18,
            $gt: 12,
        },
    },
};

const evaluator = new AttributesPolicyEvaluator<User>();

describe('src/policy/attributes', () => {
    it('should succeed with successful predicates', async () => {
        const outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext({
            data: new PolicyData({
                attributes: {
                    name: 'Peter',
                    age: 15,
                },
            }),
        }));
        expect(outcome.success).toBeTruthy();
    });

    it('should parse options', async () => {
        const validator = new AttributesPolicyValidator();
        const output = await validator.run({ query: { name: { $eq: 'admin' } } } satisfies AttributesPolicy);

        expect(output.query).toBeDefined();
    });

    it('should parse options with unknown', async () => {
        const validator = new AttributesPolicyValidator();
        const output = await validator.run({
            query: { name: { $eq: 'admin' } },
            foo: 'bar',
        } satisfies AttributesPolicy & { foo?: string }) as Partial<AttributesPolicy> & { foo?: string };

        expect(output.query).toBeDefined();
        expect(output.foo).toBeUndefined();
    });

    it('should fail with missing context', async () => {
        const outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext());
        expect(outcome.success).toBeFalsy();
    });

    it('should fail with invalid predicate value', async () => {
        const outcome = await evaluator.evaluate(
            policy,
            definePolicyEvaluationContext({
                data: new PolicyData({
                    attributes: {
                        name: 'Peter',
                        age: 28,
                    },
                }),
            }),
        );

        expect(outcome.success).toBeFalsy();
    });

    it('should compare equality case-sensitively', async () => {
        const casePolicy : AttributesPolicy<User> = { query: { name: { $eq: 'admin' } } };

        const evaluate = (name: string) => evaluator.evaluate(
            casePolicy,
            definePolicyEvaluationContext({ data: new PolicyData({ attributes: { name, age: 30 } }) }),
        );

        expect((await evaluate('admin')).success).toBeTruthy();
        expect((await evaluate('Admin')).success).toBeFalsy();
        expect((await evaluate('ADMIN')).success).toBeFalsy();
    });

    it('should compare $in membership case-sensitively', async () => {
        const inPolicy : AttributesPolicy<User> = { query: { name: { $in: ['admin', 'root'] } } };

        const evaluate = (name: string) => evaluator.evaluate(
            inPolicy,
            definePolicyEvaluationContext({ data: new PolicyData({ attributes: { name, age: 30 } }) }),
        );

        expect((await evaluate('root')).success).toBeTruthy();
        expect((await evaluate('Root')).success).toBeFalsy();
    });

    it('should support $regex as slash-literal string', async () => {
        const regexPolicy : AttributesPolicy<User> = { query: { name: { $regex: '/^pet/i' } } };

        const outcome = await evaluator.evaluate(
            regexPolicy,
            definePolicyEvaluationContext({ data: new PolicyData({ attributes: { name: 'Peter', age: 30 } }) }),
        );

        expect(outcome.success).toBeTruthy();
    });

    it('should fail with issue for a malformed query', async () => {
        const malformedPolicy = { query: { name: { $unknownOperator: 'foo' } } } as unknown as AttributesPolicy<User>;

        const outcome = await evaluator.evaluate(
            malformedPolicy,
            definePolicyEvaluationContext({ data: new PolicyData({ attributes: { name: 'Peter', age: 30 } }) }),
        );

        expect(outcome.success).toBeFalsy();
        expect(outcome.issues).toBeDefined();
        expect(outcome.issues?.length).toBeGreaterThan(0);
    });
});
