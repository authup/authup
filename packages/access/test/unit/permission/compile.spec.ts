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
    IdentityPermissionBindingPolicyEvaluator,
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
        {
            // not(attributes or unknown): never a pass, whatever the row
            permission: { name: 'nestedAffirmative' },
            policies: [
                definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    invert: true,
                    decisionStrategy: DecisionStrategy.UNANIMOUS,
                    children: [
                        definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                            decisionStrategy: DecisionStrategy.AFFIRMATIVE,
                            children: [attributes, unregistered],
                        }),
                    ],
                }),
            ],
        },
        {
            // not(attributes and unknown): a pass exactly where the attributes fail
            permission: { name: 'nestedUnanimous' },
            policies: [
                definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    invert: true,
                    decisionStrategy: DecisionStrategy.UNANIMOUS,
                    children: [
                        definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                            decisionStrategy: DecisionStrategy.UNANIMOUS,
                            children: [attributes, unregistered],
                        }),
                    ],
                }),
            ],
        },
    ];

    const unevaluableEvaluator = new PermissionEvaluator({
        provider: new PermissionMemoryProvider(bindings),
        policyEngine: new PolicyEngine(PolicyDefaultEvaluators),
    });

    const allows = (name: string, row: Record<string, any>) => unevaluableEvaluator.evaluate({
        name,
        data: definePolicyData({ [BuiltInPolicyType.ATTRIBUTES]: row }),
    }).then(() => true, () => false);

    it('should compile an inverted affirmative composite over an unevaluable child to deny', async () => {
        const result = await unevaluableEvaluator.compile({ name: 'affirmative' });

        expect(result.verdict).toEqual('deny');
    });

    const expectExact = async (name: string | string[], check: string) => {
        const result = await unevaluableEvaluator.compile({ name });

        expect(result.verdict).toEqual('conditional');

        if (result.verdict !== 'conditional') {
            return;
        }

        const predicate = test(result.condition);

        // the condition is a negation, so a row without the field counts as well
        for (const row of [{ name: 'guest' }, { name: 'admin' }, { name: null }, {}]) {
            expect(predicate(row), JSON.stringify(row)).toBe(await allows(check, row));
        }
    };

    it('should compile an inverted unanimous composite over an unevaluable child to where its sibling fails', async () => {
        // it passes exactly where the attributes fail: the fail side of the
        // attributes is known, whatever the unevaluable child adds
        await expectExact('unanimous', 'unanimous');

        expect(await allows('unanimous', { name: 'guest' })).toBe(true);
        expect(await allows('unanimous', { name: 'admin' })).toBe(false);
    });

    it('should drop an unevaluable name from the disjunction', async () => {
        expect((await unevaluableEvaluator.compile({ name: 'unregistered' })).verdict).toEqual('deny');

        expect((await unevaluableEvaluator.compile({ name: ['unregistered', 'affirmative'] })).verdict).toEqual('deny');
        await expectExact(['unregistered', 'unanimous'], 'unanimous');
    });

    // A pending child next to an unevaluable sibling, under a negating parent: the
    // inner node alone can not say which way it may still go, so a parent that
    // negated its condition admitted a row the full evaluation denies.
    it('should never admit a row through a negated affirmative node over an unevaluable child', async () => {
        const result = await unevaluableEvaluator.compile({ name: 'nestedAffirmative' });

        expect(result.verdict).toEqual('deny');

        expect(await allows('nestedAffirmative', { name: 'guest' })).toBe(false);
        expect(await allows('nestedAffirmative', { name: 'admin' })).toBe(false);
    });

    it('should compile a negated unanimous node over an unevaluable child to where its sibling fails', async () => {
        await expectExact('nestedUnanimous', 'nestedUnanimous');

        expect(await allows('nestedUnanimous', { name: 'guest' })).toBe(true);
        expect(await allows('nestedUnanimous', { name: 'admin' })).toBe(false);
    });
});

// A grant whose policy could not be evaluated still fails for every row out of
// its reach, so a negated binding check passes there: while the reach is open
// the term is no reason to deny.
describe('src/permission/evaluator (compile, a not evaluable grant with an open reach)', () => {
    const foreignRealmId = '11111111-2222-4333-8444-555555555555';
    const binding = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {});

    const reachEvaluator = new PermissionEvaluator({
        provider: new PermissionMemoryProvider([
            {
                permission: { name: 'negated' },
                policies: [definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, { invert: true })],
            },
            {
                permission: { name: 'negatedParent' },
                policies: [
                    definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                        invert: true,
                        children: [binding],
                    }),
                ],
            },
        ]),
        policyEngine: new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
        }),
    });

    const unevaluableGrant = (name: string) : PermissionPolicyBinding => ({
        permission: { name },
        realmScope: 'own',
        policies: [{ type: 'unregistered' }],
    });
    const plainGrant = (name: string) : PermissionPolicyBinding => ({
        permission: { name },
        realmScope: 'own',
    });

    it.each([
        ['an inverted binding node over a not evaluable grant', 'negated', [unevaluableGrant('negated')]],
        [
            'an inverted binding node over a not evaluable and a policy-free grant',
            'negated',
            [unevaluableGrant('negated'), plainGrant('negated')],
        ],
        ['an inverted composite over a binding node with a not evaluable grant', 'negatedParent', [unevaluableGrant('negatedParent')]],
        [
            'an inverted composite over a binding node with a not evaluable and a policy-free grant',
            'negatedParent',
            [unevaluableGrant('negatedParent'), plainGrant('negatedParent')],
        ],
    ])('should compile %s to the rows out of reach', async (_label, name, grants) => {
        const data = (realmId?: string) => definePolicyData({
            [BuiltInPolicyType.IDENTITY]: { ...identityData, grants },
            ...(realmId ? { [BuiltInPolicyType.REALM_MATCH]: realmId } : {}),
        });
        const allows = (realmId: string) => reachEvaluator.evaluate({ name, data: data(realmId) })
            .then(() => true, () => false);

        const result = await reachEvaluator.compile({ name, data: data() });

        expect(await allows(foreignRealmId)).toBe(true);
        expect(await allows(identityData.realmId)).toBe(false);

        expect(result.verdict).toEqual('conditional');

        if (result.verdict !== 'conditional') {
            return;
        }

        const predicate = test(result.condition);

        for (const realmId of [foreignRealmId, identityData.realmId, null]) {
            expect(predicate({ realmId }), `${realmId}`).toBe(await reachEvaluator.evaluate({
                name,
                data: definePolicyData({
                    [BuiltInPolicyType.IDENTITY]: { ...identityData, grants },
                    [BuiltInPolicyType.REALM_MATCH]: realmId,
                }),
            }).then(() => true, () => false));
        }
    });
});

// A grant that could not be evaluated next to one that lowers: the working grant
// still decides where the permission passes, so the read stays one filtered query.
describe('src/permission/evaluator (compile, a not evaluable grant next to a working one)', () => {
    const visible = definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { visible: true } });
    const grants : PermissionPolicyBinding[] = ['plain', 'negatedParent'].flatMap((name) => [
        {
            permission: { name },
            realmScope: 'any',
            policies: [visible],
        },
        {
            permission: { name },
            realmScope: 'any',
            policies: [{ type: 'unregistered' }],
        },
    ]);

    const mixedEvaluator = new PermissionEvaluator({
        provider: new PermissionMemoryProvider([
            {
                permission: { name: 'plain' },
                policies: [definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {})],
            },
            {
                permission: { name: 'negatedParent' },
                policies: [
                    definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                        invert: true,
                        children: [definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {})],
                    }),
                ],
            },
        ]),
        policyEngine: new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
        }),
    });

    const data = (row?: Record<string, any>) => definePolicyData({
        [BuiltInPolicyType.IDENTITY]: { ...identityData, grants },
        ...(row ? { [BuiltInPolicyType.ATTRIBUTES]: row } : {}),
    });
    const allows = (name: string, row: Record<string, any>) => mixedEvaluator.evaluate({ name, data: data(row) })
        .then(() => true, () => false);
    const rows = [{ visible: true }, { visible: false }];

    it('should compile the binding check to the condition of the working grant', async () => {
        const result = await mixedEvaluator.compile({ name: 'plain', data: data() });

        expect(await allows('plain', { visible: true })).toBe(true);
        expect(await allows('plain', { visible: false })).toBe(false);

        expect(result.verdict).toEqual('conditional');

        if (result.verdict !== 'conditional') {
            return;
        }

        const predicate = test(result.condition);

        for (const row of rows) {
            expect(predicate(row), JSON.stringify(row)).toBe(await allows('plain', row));
        }
    });

    it('should never admit a row through an inverted composite above it', async () => {
        // visible: the binding check passes, so its negation fails; hidden: it could
        // not be evaluated, and neither can its negation
        const result = await mixedEvaluator.compile({ name: 'negatedParent', data: data() });

        for (const row of rows) {
            expect(await allows('negatedParent', row), JSON.stringify(row)).toBe(false);
        }

        expect(result.verdict).toEqual('deny');
    });
});
