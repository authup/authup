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
    IdentityPermissionBindingPolicyEvaluator,
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

// A policy that could not be evaluated is no pass at either gate: the pre-gate
// permits pending only, and `invert` never turns the failure into a pass.
describe('src/permission/evaluator (not evaluable)', () => {
    const unregistered = { type: 'unregistered' };
    const bindings : PermissionPolicyBinding[] = [
        {
            // the shape of `system.default`
            permission: { name: 'user_read' },
            policies: [
                definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    decisionStrategy: DecisionStrategy.UNANIMOUS,
                    children: [
                        definePolicyWithType(BuiltInPolicyType.IDENTITY, {}),
                        definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {}),
                    ],
                }),
            ],
        },
        {
            permission: { name: 'user_create' },
            policies: [unregistered],
        },
        {
            permission: { name: 'user_delete' },
            policies: [
                definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    invert: true,
                    decisionStrategy: DecisionStrategy.UNANIMOUS,
                    children: [unregistered],
                }),
            ],
        },
        {
            permission: { name: 'user_update' },
            policies: [
                definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    invert: true,
                    decisionStrategy: DecisionStrategy.AFFIRMATIVE,
                    children: [attributesPolicy, unregistered],
                }),
            ],
        },
    ];

    const bindingEvaluator = new PermissionEvaluator({
        provider: new PermissionMemoryProvider(bindings),
        policyEngine: new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
        }),
    });

    it('should deny an anonymous caller at the pre-gate of a binding check', async () => {
        await expect(bindingEvaluator.preEvaluate({ name: 'user_read' }))
            .rejects.toBeInstanceOf(PermissionError);
    });

    it.each([
        ['an unregistered policy type', 'user_create'],
        ['an inverted composite over an unregistered policy type', 'user_delete'],
        ['an inverted composite over a pending and an unregistered policy type', 'user_update'],
    ])('should deny %s at both gates', async (_label, name) => {
        await expect(bindingEvaluator.preEvaluate({ name }))
            .rejects.toBeInstanceOf(PermissionError);

        await expect(bindingEvaluator.evaluate({ name }))
            .rejects.toBeInstanceOf(PermissionError);

        await expect(bindingEvaluator.evaluate({
            name,
            data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: { name: 'guest' } }),
        })).rejects.toBeInstanceOf(PermissionError);
    });
});
