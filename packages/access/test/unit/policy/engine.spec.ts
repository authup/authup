/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import {
    BuiltInPolicyType,
    DecisionStrategy,
    PolicyEngine,
    defineAttributesPolicy,
    definePolicyWithType,
} from '../../../src';
import { buildTestPolicyEvaluateContext } from '../../utils';

type User = {
    id: string,
    name: string,
};

describe('src/policy', () => {
    it('should work with default evaluators', async () => {
        const enforcer = new PolicyEngine();

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

        const compositePolicy = definePolicyWithType(
            BuiltInPolicyType.COMPOSITE,
            {
                decisionStrategy: DecisionStrategy.UNANIMOUS,
                children: [
                    attributePolicy,
                    attributeNamesPolicy,
                ],
            },
        );

        let outcome = await enforcer.evaluate(buildTestPolicyEvaluateContext({
            config: compositePolicy,
            input: {
                attributes: {
                    name: 'admin',
                },
            },
        }));
        expect(outcome).toBeTruthy();

        outcome = await enforcer.evaluate(buildTestPolicyEvaluateContext({
            config: compositePolicy,
            input: {
                attributes: {
                    id: 'foo',
                    name: 'admin',
                },
            },
        }));
        expect(outcome).toBeFalsy();

        outcome = await enforcer.evaluate(buildTestPolicyEvaluateContext({
            config: compositePolicy,
            input: {
                attributes: {
                    name: 'foo',
                },
            },
        }));
        expect(outcome).toBeFalsy();
    });
});
