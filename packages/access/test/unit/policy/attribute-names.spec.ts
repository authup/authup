/*
 * Copyright (c) 2024-2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { AttributeNamesPolicy } from '../../../src';
import {
    AttributeNamesPolicyEvaluator,
    AttributeNamesPolicyValidator,
    BuiltInPolicyType,
    PolicyData,
    PolicyEngine,
    PolicyIssueCode,
    definePolicyEvaluationContext,
    definePolicyWithType,
} from '../../../src';
import { PolicyDefaultEvaluators } from '../../../src/policy/constants.ts';

const evaluator = new AttributeNamesPolicyEvaluator();

describe('src/policy/attribute-names', () => {
    it('should succeed with known attributes', async () => {
        const policy : AttributeNamesPolicy = {
            invert: false,
            names: ['foo', 'bar'],
        };

        const outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext({
            data: new PolicyData({
                attributes: {
                    foo: 'bar',
                    bar: 'baz',
                },
            }),
        }));
        expect(outcome.success)
            .toBeTruthy();
    });

    it('should parse options', async () => {
        const validator = new AttributeNamesPolicyValidator();
        const output = await validator.run({ names: ['foo', 'bar'] } satisfies AttributeNamesPolicy);

        expect(output.names).toEqual(['foo', 'bar']);
    });

    it('should parse options with unknown', async () => {
        const validator = new AttributeNamesPolicyValidator();
        const input : AttributeNamesPolicy & { foo?: string } = {
            names: ['foo', 'bar'],
            foo: 'bar',
        };
        const output = await validator.run(input) as Partial<AttributeNamesPolicy> & { foo?: string };

        expect(output.names).toBeDefined();
        expect(output.foo).toBeUndefined();
    });

    it('should report pending with missing context', async () => {
        const policy : AttributeNamesPolicy = {
            invert: false,
            names: ['foo', 'bar'],
        };

        const outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext());
        expect(outcome.success).toBeFalsy();
        expect(outcome.pending).toBeTruthy();
        expect(outcome.issues![0].code).toEqual(PolicyIssueCode.DATA_MISSING);
    });

    it('should fail with unknown attributes', async () => {
        const policy : AttributeNamesPolicy = {
            invert: false,
            names: ['foo', 'bar'],
        };

        const outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext({
            data: new PolicyData({
                attributes: {
                    foo: 'bar',
                    bar: 'baz',
                    baz: 'boz',
                },
            }),
        }));
        expect(outcome.success).toBeFalsy();
    });

    it('should succeed with known nested attributes', async () => {
        const policy: AttributeNamesPolicy = {
            names: [
                'user.name',
                'age',
            ],
        };

        const outcome = await evaluator.evaluate(
            policy,
            definePolicyEvaluationContext({ data: new PolicyData({ attributes: { user: { name: 'admin' } } }) }),
        );
        expect(outcome.success)
            .toBeTruthy();
    });

    it('should fail with unknown nested attributes', async () => {
        const policy: AttributeNamesPolicy = {
            names: [
                'user.name',
                'age',
            ],
        };

        const outcome = await evaluator.evaluate(
            policy,
            definePolicyEvaluationContext({ data: new PolicyData({ attributes: { user: { displayName: 'admin' } } }) }),
        );
        expect(outcome.success)
            .toBeFalsy();
    });

    it('should fail with partially known nested attributes', async () => {
        const policy: AttributeNamesPolicy = {
            names: [
                'user.name',
                'age',
            ],
        };

        const outcome = await evaluator.evaluate(
            policy,
            definePolicyEvaluationContext({
                data: new PolicyData({
                    attributes: {
                        user: {
                            name: 'admin',
                            id: 'xxx',
                        },
                    },
                }),
            }),
        );
        expect(outcome.success).toBeFalsy();
    });

    describe('attributeNames data key (projection mode)', () => {
        it('should succeed with permitted names', async () => {
            const policy : AttributeNamesPolicy = { names: ['foo', 'bar'] };

            const outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: ['foo', 'bar'] }) }),
            );
            expect(outcome.success).toBeTruthy();
        });

        it('should fail with a name outside the allowlist', async () => {
            const policy : AttributeNamesPolicy = { names: ['foo', 'bar'] };

            const outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: ['foo', 'baz'] }) }),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.issues).toHaveLength(1);
            expect(outcome.issues![0].code).toEqual(PolicyIssueCode.EVALUATION_DENIED);
            expect(outcome.issues![0].path).toEqual(['baz']);
        });

        it('should apply invert per name (denylist)', async () => {
            const policy : AttributeNamesPolicy = {
                invert: true,
                names: ['secret'],
            };

            let outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: ['secret'] }) }),
            );
            expect(outcome.success).toBeFalsy();

            outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: ['title'] }) }),
            );
            expect(outcome.success).toBeTruthy();
        });

        it('should succeed with an empty projection', async () => {
            const policy : AttributeNamesPolicy = { names: ['foo'] };

            let outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: [] }) }),
            );
            expect(outcome.success).toBeTruthy();

            outcome = await evaluator.evaluate(
                { ...policy, invert: true },
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: [] }) }),
            );
            expect(outcome.success).toBeTruthy();
        });

        it('should fail with malformed projection data', async () => {
            const policy : AttributeNamesPolicy = { names: ['foo'] };

            let outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: { foo: true } }) }),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.issues![0].code).toEqual(PolicyIssueCode.DATA_INVALID);

            outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: ['foo', 42] }) }),
            );
            expect(outcome.success).toBeFalsy();
            expect(outcome.issues![0].code).toEqual(PolicyIssueCode.DATA_INVALID);
        });

        it('should enforce both sources when both are present', async () => {
            const policy : AttributeNamesPolicy = { names: ['foo'] };

            let outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext({
                data: new PolicyData({
                    attributeNames: ['foo'],
                    attributes: { secret: 'x' },
                }),
            }));
            expect(outcome.success).toBeFalsy();
            expect(outcome.issues![0].path).toEqual(['secret']);

            outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext({
                data: new PolicyData({
                    attributeNames: ['secret'],
                    attributes: { foo: 'bar' },
                }),
            }));
            expect(outcome.success).toBeFalsy();
            expect(outcome.issues![0].path).toEqual(['secret']);

            outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext({
                data: new PolicyData({
                    attributeNames: ['foo'],
                    attributes: { foo: 'bar' },
                }),
            }));
            expect(outcome.success).toBeTruthy();
        });

        it('should deduplicate a name present in both sources', async () => {
            const policy : AttributeNamesPolicy = {
                invert: true,
                names: ['secret'],
            };

            const outcome = await evaluator.evaluate(policy, definePolicyEvaluationContext({
                data: new PolicyData({
                    attributeNames: ['secret'],
                    attributes: { secret: 'x' },
                }),
            }));
            expect(outcome.success).toBeFalsy();
            expect(outcome.issues).toHaveLength(1);
        });

        it('should answer both questions with the same policy', async () => {
            const policy : AttributeNamesPolicy = {
                invert: true,
                names: ['secret'],
            };

            let outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributes: { name: 'admin' } }) }),
            );
            expect(outcome.success).toBeTruthy();

            outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: ['name'] }) }),
            );
            expect(outcome.success).toBeTruthy();

            outcome = await evaluator.evaluate(
                policy,
                definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: ['secret'] }) }),
            );
            expect(outcome.success).toBeFalsy();
        });

        describe('engine data-availability (tri-state)', () => {
            const engine = new PolicyEngine(PolicyDefaultEvaluators);

            it('should report pending when neither data key is present', async () => {
                const policy = definePolicyWithType(BuiltInPolicyType.ATTRIBUTE_NAMES, { names: ['foo'] } satisfies AttributeNamesPolicy);

                const outcome = await engine.evaluate(policy, definePolicyEvaluationContext());
                expect(outcome.success).toBeFalsy();
                expect(outcome.pending).toBeTruthy();
            });

            it('should settle against the names key', async () => {
                const policy = definePolicyWithType(BuiltInPolicyType.ATTRIBUTE_NAMES, { names: ['foo'] } satisfies AttributeNamesPolicy);

                let outcome = await engine.evaluate(
                    policy,
                    definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: ['foo'] }) }),
                );
                expect(outcome.success).toBeTruthy();
                expect(outcome.pending).toBeFalsy();

                outcome = await engine.evaluate(
                    policy,
                    definePolicyEvaluationContext({ data: new PolicyData({ attributeNames: ['bar'] }) }),
                );
                expect(outcome.success).toBeFalsy();
                expect(outcome.pending).toBeFalsy();
            });

            it('should settle against the attributes key', async () => {
                const policy = definePolicyWithType(BuiltInPolicyType.ATTRIBUTE_NAMES, { names: ['foo'] } satisfies AttributeNamesPolicy);

                const outcome = await engine.evaluate(
                    policy,
                    definePolicyEvaluationContext({ data: new PolicyData({ attributes: { foo: 'bar' } }) }),
                );
                expect(outcome.success).toBeTruthy();
                expect(outcome.pending).toBeFalsy();
            });
        });
    });
});
