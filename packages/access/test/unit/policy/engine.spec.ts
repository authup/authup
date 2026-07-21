/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    beforeAll,
    describe,
    expect,
    it,
} from 'vitest';
import type { BasePolicy } from '../../../src';
import { DecisionStrategy } from '@authup/kit';
import {
    BuiltInPolicyType,
    PolicyData,
    PolicyEngine,
    defineAttributesPolicy,
    definePolicyEvaluationContext,
    definePolicyWithType,
} from '../../../src';
import { PolicyDefaultEvaluators } from '../../../src/policy/constants.ts';

type User = {
    id: string,
    name: string,
};

describe('src/policy', () => {
    let enforcer : PolicyEngine;

    let compositePolicy : BasePolicy;

    beforeAll(() => {
        enforcer = new PolicyEngine(PolicyDefaultEvaluators);

        const attributePolicy = definePolicyWithType(
            BuiltInPolicyType.ATTRIBUTES,
            defineAttributesPolicy<User>({ query: { name: { $eq: 'admin' } } }),
        );

        const attributeNamesPolicy = definePolicyWithType(
            BuiltInPolicyType.ATTRIBUTE_NAMES,
            { names: ['name'] },
        );

        compositePolicy = definePolicyWithType(
            BuiltInPolicyType.COMPOSITE,
            {
                decisionStrategy: DecisionStrategy.UNANIMOUS,
                children: [
                    attributePolicy,
                    attributeNamesPolicy,
                ],
            },
        );
    });

    it('should evaluate with valid data', async () => {
        const outcome = await enforcer.evaluate(compositePolicy, definePolicyEvaluationContext({ data: new PolicyData({ attributes: { name: 'admin' } }) }));
        expect(outcome.success).toBeTruthy();
    });

    it('should evaluate with invalid data', async () => {
        let outcome = await enforcer.evaluate(compositePolicy, definePolicyEvaluationContext({
            data: new PolicyData({
                [BuiltInPolicyType.ATTRIBUTES]: {
                    id: 'foo',
                    name: 'admin',
                },
            }),
        }));

        expect(outcome.success).toBeFalsy();

        outcome = await enforcer.evaluate(compositePolicy, definePolicyEvaluationContext({ data: new PolicyData({ attributes: { name: 'foo' } }) }));
        expect(outcome.success).toBeFalsy();
    });

    describe('data-availability gate (tri-state)', () => {
        const identityData = {
            type: 'user',
            id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
            realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
        };

        it('should return pending when a required data key is absent', async () => {
            const policy = definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] });

            const outcome = await enforcer.evaluate(policy, definePolicyEvaluationContext());
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeTruthy();
            expect(outcome.issues).toHaveLength(1);
        });

        it('should not apply invert to a pending result', async () => {
            const policy = definePolicyWithType(BuiltInPolicyType.IDENTITY, {
                types: ['user'],
                invert: true,
            });

            const outcome = await enforcer.evaluate(policy, definePolicyEvaluationContext());
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeTruthy();
        });

        it('should settle when the required data key is present', async () => {
            const policy = definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] });
            const data = new PolicyData({ [BuiltInPolicyType.IDENTITY]: identityData });

            const outcome = await enforcer.evaluate(policy, definePolicyEvaluationContext({ data }));
            expect(outcome.success).toBeTruthy();
            expect(outcome.pending).toBeFalsy();
        });

        // The issue #3286 regression: NOT(attributes AND identity) with a satisfying
        // identity and no attributes yet. Masking attributes to true would evaluate
        // NOT(identity) and produce a spurious settled deny — the tree must stay pending.
        it('should stay pending under inversion instead of settling a masked deny', async () => {
            const policy = definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                invert: true,
                decisionStrategy: DecisionStrategy.UNANIMOUS,
                children: [
                    definePolicyWithType(
                        BuiltInPolicyType.ATTRIBUTES,
                        defineAttributesPolicy<User>({ query: { name: { $eq: 'admin' } } }),
                    ),
                    definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] }),
                ],
            });

            const data = new PolicyData({ [BuiltInPolicyType.IDENTITY]: identityData });

            const outcome = await enforcer.evaluate(policy, definePolicyEvaluationContext({ data }));
            expect(outcome.success).toBeFalsy();
            expect(outcome.pending).toBeTruthy();

            // full bag, attributes fail: NOT(false AND true) => allow
            const allowed = await enforcer.evaluate(policy, definePolicyEvaluationContext({
                data: new PolicyData({
                    [BuiltInPolicyType.IDENTITY]: identityData,
                    [BuiltInPolicyType.ATTRIBUTES]: { name: 'guest' },
                }),
            }));
            expect(allowed.success).toBeTruthy();
            expect(allowed.pending).toBeFalsy();

            // full bag, attributes match: NOT(true AND true) => deny (settled)
            const denied = await enforcer.evaluate(policy, definePolicyEvaluationContext({
                data: new PolicyData({
                    [BuiltInPolicyType.IDENTITY]: identityData,
                    [BuiltInPolicyType.ATTRIBUTES]: { name: 'admin' },
                }),
            }));
            expect(denied.success).toBeFalsy();
            expect(denied.pending).toBeFalsy();
        });
    });
});
