/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import { DecisionStrategy } from '@authup/kit';
import type { PermissionPolicyBinding } from '../../../src';
import {
    BuiltInPolicyType,
    PermissionError,
    PermissionEvaluator,
    PermissionMemoryProvider,
    PolicyDefaultEvaluators,
    PolicyEngine,
    definePolicyData,
    definePolicyWithType,
} from '../../../src';

const identityData = {
    type: 'user',
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
};

const attributesPolicy = definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: { $eq: 'admin' } } });

const abilities : PermissionPolicyBinding[] = [
    {
        permission: { name: 'user_edit' },
        policies: [attributesPolicy],
    },
    {
        permission: { name: 'user_view' },
        policies: [
            definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['client'] }),
        ],
    },
    {
        // NOT(attributes AND identity) — the issue #3286 inversion regression.
        permission: { name: 'user_remove' },
        policies: [
            definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                invert: true,
                decisionStrategy: DecisionStrategy.UNANIMOUS,
                children: [
                    attributesPolicy,
                    definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] }),
                ],
            }),
        ],
    },
];

const evaluator = new PermissionEvaluator({
    provider: new PermissionMemoryProvider(abilities),
    policyEngine: new PolicyEngine(PolicyDefaultEvaluators),
});

describe('src/permission/evaluator (derived pre-gate)', () => {
    it('should permit a pending attributes policy at the pre-gate', async () => {
        await expect(evaluator.preEvaluate({ name: 'user_edit' }))
            .resolves.toBeUndefined();
    });

    it('should deny a pending attributes policy on full evaluation', async () => {
        await expect(evaluator.evaluate({ name: 'user_edit' }))
            .rejects.toBeInstanceOf(PermissionError);
    });

    it('should settle an attributes policy once the data is present', async () => {
        await expect(evaluator.evaluate({
            name: 'user_edit',
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { name: 'admin' } }),
        })).resolves.toBeUndefined();

        await expect(evaluator.evaluate({
            name: 'user_edit',
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { name: 'guest' } }),
        })).rejects.toBeInstanceOf(PermissionError);
    });

    it('should deny a settled-false identity policy at the pre-gate', async () => {
        await expect(evaluator.preEvaluate({
            name: 'user_view',
            data: definePolicyData({ [BuiltInPolicyType.IDENTITY]: identityData }),
        })).rejects.toBeInstanceOf(PermissionError);
    });

    it('should permit a pending identity policy at the pre-gate', async () => {
        await expect(evaluator.preEvaluate({ name: 'user_view' }))
            .resolves.toBeUndefined();
    });

    // Regression (issue #3286): the former exclusion-list pre-gate masked the
    // attributes child to `true` and evaluated NOT(identity) — a spurious settled
    // deny for a satisfying identity. Tri-state keeps the tree pending instead.
    it('should not spuriously deny an inverted composite at the pre-gate', async () => {
        await expect(evaluator.preEvaluate({
            name: 'user_remove',
            data: definePolicyData({ [BuiltInPolicyType.IDENTITY]: identityData }),
        })).resolves.toBeUndefined();
    });

    it('should keep full semantics for the inverted composite', async () => {
        // NOT(false AND true) => allow
        await expect(evaluator.evaluate({
            name: 'user_remove',
            data: definePolicyData({
                [BuiltInPolicyType.IDENTITY]: identityData,
                [BuiltInPolicyType.ATTRIBUTES]: { name: 'guest' },
            }),
        })).resolves.toBeUndefined();

        // NOT(true AND true) => deny
        await expect(evaluator.evaluate({
            name: 'user_remove',
            data: definePolicyData({
                [BuiltInPolicyType.IDENTITY]: identityData,
                [BuiltInPolicyType.ATTRIBUTES]: { name: 'admin' },
            }),
        })).rejects.toBeInstanceOf(PermissionError);
    });

    it('should keep explicit policy exclusion functional', async () => {
        await expect(evaluator.evaluate({
            name: 'user_edit',
            options: { policiesExcluded: [BuiltInPolicyType.ATTRIBUTES] },
        })).resolves.toBeUndefined();
    });
});
