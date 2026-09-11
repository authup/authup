/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { compileFilters } from '@rapiq/adapter-memory';
import type { IFilter, IFilters } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import type { PermissionPolicyBinding } from '../../../src';
import {
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PolicyDefaultEvaluators,
    PolicyEngine,
    definePolicyData,
    definePolicyEvaluationContext,
    definePolicyWithType,
} from '../../../src';

const identity = {
    type: 'user',
    id: '245e3c5d-5747-4fbd-8554-c33d34780c58',
    realmId: 'c641912c-21e5-4cb4-84b6-169e2b2bb023',
};
const permission = { name: 'user_read' };

describe('identity permission binding compilation', () => {
    it.each([false, true])('matches concrete evaluation for nested grants (invert: %s)', async (invert) => {
        const bindings: PermissionPolicyBinding[] = [
            { permission, realmScope: 'own' },
            {
                permission,
                realmScope: 'any',
                policies: [definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    children: [
                        definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['user'] }),
                        definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: 'public' } }),
                    ],
                })],
            },
        ];
        const engine = new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator({ getFor: async () => bindings }),
        });
        const policy = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, { invert });
        const data = () => definePolicyData({
            [BuiltInPolicyType.IDENTITY]: identity,
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        });
        const compiled = await engine.evaluate(policy, definePolicyEvaluationContext({
            data: data(),
            withConditions: true,
        }));
        expect(compiled.pending).toBe(true);
        expect(compiled.condition).toBeDefined();
        const predicate = compileFilters(compiled.condition! as IFilter | IFilters, { caseSensitive: true });

        const rows = [
            {
                realmId: identity.realmId,
                name: 'private',
                allowed: true,
            },
            {
                realmId: '11111111-2222-4333-8444-555555555555',
                name: 'public',
                allowed: true,
            },
            {
                realmId: '11111111-2222-4333-8444-555555555555',
                name: 'private',
                allowed: false,
            },
            {
                realmId: null,
                name: 'public',
                allowed: true,
            },
            {
                realmId: null,
                name: 'private',
                allowed: false,
            },
        ];
        for (const row of rows) {
            const concreteData = data();
            concreteData.set(BuiltInPolicyType.REALM_MATCH, row.realmId);
            concreteData.set(BuiltInPolicyType.ATTRIBUTES, row);
            const settled = await engine.evaluate(policy, definePolicyEvaluationContext({ data: concreteData }));
            const expected = invert ? !row.allowed : row.allowed;
            expect(settled.success, JSON.stringify(row)).toBe(expected);
            expect(predicate(row), JSON.stringify(row)).toBe(expected);
        }
    });

    it('denies null-realm rows to a realm-less actor with ownOrNull reach', async () => {
        const engine = new PolicyEngine(PolicyDefaultEvaluators);
        const policy = definePolicyWithType(BuiltInPolicyType.REALM_MATCH, { scope: 'ownOrNull' });
        const data = definePolicyData({ [BuiltInPolicyType.IDENTITY]: { ...identity, realmId: null } });
        const compiled = await engine.evaluate(policy, definePolicyEvaluationContext({ data, withConditions: true }));
        expect(compiled.condition).toBeDefined();
        const predicate = compileFilters(compiled.condition! as IFilter | IFilters, { caseSensitive: true });

        data.set(BuiltInPolicyType.REALM_MATCH, null);
        const settled = await engine.evaluate(policy, definePolicyEvaluationContext({ data }));
        expect(settled.success).toBe(false);
        expect(predicate({ realmId: null })).toBe(false);
    });
});
