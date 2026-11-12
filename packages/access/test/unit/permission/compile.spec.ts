/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { describe, expect, it } from 'vitest';
import type { ICondition, IFilter, IFilters } from '@rapiq/core';
import { compileFilters } from '@rapiq/adapter-memory';
import { DecisionStrategy } from '@authup/kit';
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

        if (result.verdict !== 'conditional') {
            return;
        }

        const predicate = test(result.condition);

        expect(predicate({ name: 'admin' })).toBeTruthy();
        expect(predicate({ name: 'guest' })).toBeFalsy();
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

// A subtree that could not be evaluated never passes, so a condition must not
// admit a row through it and `invert` must not turn it into an allow.
describe('src/permission/evaluator (compile, not evaluable)', () => {
    const attributes = definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: { $eq: 'admin' } } });
    const unregistered = { type: 'unregistered' };

    const bindings : PermissionPolicyBinding[] = [
        {
            permission: { name: 'affirmative' },
            policies: [
                definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    invert: true,
                    decisionStrategy: DecisionStrategy.AFFIRMATIVE,
                    children: [attributes, unregistered],
                }),
            ],
        },
        {
            permission: { name: 'unanimous' },
            policies: [
                definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    invert: true,
                    decisionStrategy: DecisionStrategy.UNANIMOUS,
                    children: [attributes, unregistered],
                }),
            ],
        },
        {
            permission: { name: 'unregistered' },
            policies: [unregistered],
        },
    ];

    const unevaluableEvaluator = new PermissionEvaluator({
        provider: new PermissionMemoryProvider(bindings),
        policyEngine: new PolicyEngine(PolicyDefaultEvaluators),
    });

    it('should compile an inverted affirmative composite over an unevaluable child to deny', async () => {
        const result = await unevaluableEvaluator.compile({ name: 'affirmative' });

        expect(result.verdict).toEqual('deny');
    });

    it('should compile an inverted unanimous composite over an unevaluable child to the negated condition', async () => {
        const result = await unevaluableEvaluator.compile({ name: 'unanimous' });

        expect(result.verdict).toEqual('conditional');

        if (result.verdict !== 'conditional') {
            return;
        }

        const predicate = test(result.condition);

        for (const row of [{ name: 'admin' }, { name: 'guest' }]) {
            const allowed = await unevaluableEvaluator.evaluate({
                name: 'unanimous',
                data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: row }),
            }).then(() => true, () => false);

            expect(predicate(row), row.name).toBe(allowed);
        }

        expect(predicate({ name: 'admin' })).toBe(false);
        expect(predicate({ name: 'guest' })).toBe(true);
    });

    it('should drop an unevaluable name from the disjunction', async () => {
        expect((await unevaluableEvaluator.compile({ name: 'unregistered' })).verdict).toEqual('deny');
        expect((await unevaluableEvaluator.compile({ name: ['unregistered', 'affirmative'] })).verdict).toEqual('deny');
    });
});
