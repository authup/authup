/*
 * Copyright (c) 2024.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import type { AttributeNamesPolicy, AttributesPolicy, BuiltInPolicy } from '../../../src';
import {
    BuiltInPolicyType,
    PolicyDecisionStrategy, PolicyEnforcer,
} from '../../../src';

type User = {
    id: string,
    name: string,
};

describe('src/policy', () => {
    it('should work with default evaluators', () => {
        const enforcer = new PolicyEnforcer();

        const attributePolicy : AttributesPolicy<User> = {
            type: BuiltInPolicyType.ATTRIBUTES,
            query: {
                name: {
                    $eq: 'admin',
                },
            },
        };

        const attributeNamesPolicy : AttributeNamesPolicy = {
            type: BuiltInPolicyType.ATTRIBUTE_NAMES,
            names: ['name'],
        };

        const compositePolicy : BuiltInPolicy<User> = {
            type: BuiltInPolicyType.COMPOSITE,
            decisionStrategy: PolicyDecisionStrategy.UNANIMOUS,
            children: [
                attributePolicy,
                attributeNamesPolicy,
            ],
        };

        let outcome = enforcer.evaluateMany([compositePolicy], {
            target: {
                name: 'admin',
            },
        });
        expect(outcome).toBeTruthy();

        outcome = enforcer.evaluate(compositePolicy, {
            target: {
                id: 'foo',
                name: 'admin',
            },
        });
        expect(outcome).toBeFalsy();

        outcome = enforcer.evaluate(compositePolicy, {
            target: {
                name: 'foo',
            },
        });
        expect(outcome).toBeFalsy();
    });
});
