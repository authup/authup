/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    beforeAll, describe, expect, it,
} from 'vitest';
import type { IPolicy } from '../../../src';
import {
    BuiltInPolicyType,
    DecisionStrategy,
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

    let compositePolicy : IPolicy;

    beforeAll(() => {
        enforcer = new PolicyEngine(PolicyDefaultEvaluators);

        const attributePolicy = definePolicyWithType(
            BuiltInPolicyType.ATTRIBUTES,
            defineAttributesPolicy<User>({
                query: {
                    name: {
                        $eq: 'admin',
                    },
                },
            }),
        );

        const attributeNamesPolicy = definePolicyWithType(
            BuiltInPolicyType.ATTRIBUTE_NAMES,
            {
                names: ['name'],
            },
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
        const outcome = await enforcer.evaluate(compositePolicy, definePolicyEvaluationContext({
            data: new PolicyData({
                attributes: {
                    name: 'admin',
                },
            }),
        }));
        expect(outcome.success).toBeTruthy();
    });

    it('should evaluate with invalid data', async () => {
        let outcome = await enforcer.evaluate(compositePolicy, definePolicyEvaluationContext({
            data: new PolicyData({
                attributes: {
                    id: 'foo',
                    name: 'admin',
                },
            }),
        }));

        expect(outcome.success).toBeFalsy();

        outcome = await enforcer.evaluate(compositePolicy, definePolicyEvaluationContext({
            data: new PolicyData({
                attributes: {
                    name: 'foo',
                },
            }),
        }));
        expect(outcome.success).toBeFalsy();
    });
});
