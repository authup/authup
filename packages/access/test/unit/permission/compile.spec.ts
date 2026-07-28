/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { ICondition, IFilter, IFilters } from '@rapiq/core';
import { compileFilters } from '@rapiq/adapter-memory';
import type { PermissionPolicyBinding } from '../../../src';
import {
    BuiltInPolicyType,
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

const abilities : PermissionPolicyBinding[] = [
    { permission: { name: 'user_create' } },
    {
        permission: { name: 'user_edit' },
        policies: [
            definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: { $eq: 'admin' } } }),
        ],
    },
    {
        permission: { name: 'user_update' },
        policies: [
            definePolicyWithType(BuiltInPolicyType.ATTRIBUTE_NAMES, { names: ['name'] }),
        ],
    },
    {
        permission: { name: 'user_view' },
        policies: [
            definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['client'] }),
        ],
    },
];

const evaluator = new PermissionEvaluator({
    provider: new PermissionMemoryProvider(abilities),
    policyEngine: new PolicyEngine(PolicyDefaultEvaluators),
});

const test = (condition: ICondition) => compileFilters(condition as IFilter | IFilters, { caseSensitive: true });

describe('src/permission/evaluator (compile)', () => {
    it('should compile an unrestricted permission to allow', async () => {
        const result = await evaluator.compile({ name: 'user_create' });
        expect(result.verdict).toEqual('allow');
    });

    it('should compile a lowerable policy to a conditional', async () => {
        const result = await evaluator.compile({ name: 'user_edit' });
        expect(result.verdict).toEqual('conditional');

        if (result.verdict === 'conditional') {
            const predicate = test(result.condition);
            expect(predicate({ name: 'admin' })).toBeTruthy();
            expect(predicate({ name: 'guest' })).toBeFalsy();
        }
    });

    it('should short-circuit to allow when any name is unrestricted', async () => {
        const result = await evaluator.compile({ name: ['user_edit', 'user_create'] });
        expect(result.verdict).toEqual('allow');
    });

    it('should degrade to post when any name is not expressible', async () => {
        const result = await evaluator.compile({ name: ['user_edit', 'user_update'] });
        expect(result.verdict).toEqual('post');
    });

    it('should compile an unresolvable permission to deny', async () => {
        const result = await evaluator.compile({ name: 'unknown' });
        expect(result.verdict).toEqual('deny');
    });

    it('should compile a settled-false policy to deny', async () => {
        const result = await evaluator.compile({
            name: 'user_view',
            data: definePolicyData({ [BuiltInPolicyType.IDENTITY]: identityData }),
        });
        expect(result.verdict).toEqual('deny');
    });

    it('should drop settled-false names from the disjunction', async () => {
        const result = await evaluator.compile({
            name: ['user_edit', 'user_view'],
            data: definePolicyData({ [BuiltInPolicyType.IDENTITY]: identityData }),
        });
        expect(result.verdict).toEqual('conditional');
    });

    it('should degrade to post when a pending policy carries no condition', async () => {
        // identity policy without identity data: pending, not expressible
        const result = await evaluator.compile({ name: 'user_view' });
        expect(result.verdict).toEqual('post');
    });
});
