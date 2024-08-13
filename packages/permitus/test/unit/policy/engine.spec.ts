/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type {
    AttributeNamesPolicy, AttributesPolicy, BuiltInPolicy, PolicyWithType,
} from '../../../src';
import {
    BuiltInPolicyType,
    DecisionStrategy, PolicyEngine,
} from '../../../src';

type User = {
    id: string,
    name: string,
};

describe('src/policy', () => {
    it('should work with default evaluators', async () => {
        const enforcer = new PolicyEngine();

        const attributePolicy : PolicyWithType<AttributesPolicy<User>> = {
            type: BuiltInPolicyType.ATTRIBUTES,
            query: {
                name: {
                    $eq: 'admin',
                },
            },
        };

        const attributeNamesPolicy : PolicyWithType<AttributeNamesPolicy> = {
            type: BuiltInPolicyType.ATTRIBUTE_NAMES,
            names: ['name'],
        };

        const compositePolicy : PolicyWithType<BuiltInPolicy<User>> = {
            type: BuiltInPolicyType.COMPOSITE,
            decisionStrategy: DecisionStrategy.UNANIMOUS,
            children: [
                attributePolicy,
                attributeNamesPolicy,
            ],
        };

        let outcome = await enforcer.evaluate(compositePolicy, {
            attributes: {
                name: 'admin',
            },
        });
        expect(outcome).toBeTruthy();

        outcome = await enforcer.evaluate(compositePolicy, {
            attributes: {
                id: 'foo',
                name: 'admin',
            },
        });
        expect(outcome).toBeFalsy();

        outcome = await enforcer.evaluate(compositePolicy, {
            attributes: {
                name: 'foo',
            },
        });
        expect(outcome).toBeFalsy();
    });
});
