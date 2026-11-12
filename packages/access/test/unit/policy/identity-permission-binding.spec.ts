/*
 * Copyright (c) 2026.
 * Author Peter Placzek (tada5hi)
 * For the full copyright and license information,
 * view the LICENSE file that was distributed with this source code.
 */

import { compileFilters } from '@rapiq/adapter-memory';
import type { IFilter, IFilters } from '@rapiq/core';
import { describe, expect, it } from 'vitest';
import type { PermissionPolicyBinding, PolicyWithType } from '../../../src';
import {
    BuiltInPolicyType,
    IdentityPermissionBindingPolicyEvaluator,
    PolicyDefaultEvaluators,
    PolicyEngine,
    PolicyIssueCode,
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
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
        });
        const policy = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, { invert });
        const data = () => definePolicyData({
            [BuiltInPolicyType.IDENTITY]: { ...identity, grants: bindings },
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

    it('lowers the reach onto the column realmAttributeName names', async () => {
        // a junction row carries no `realmId` at all — it carries the realm of the
        // entities it links (`roleRealmId`, `clientRealmId`, …), so the reach has to
        // bind that column or the emitted WHERE names a column the table does not
        // have (issue #3594)
        const bindings: PermissionPolicyBinding[] = [{ permission, realmScope: 'ownOrNull' }];
        const engine = new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
        });
        const policy = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {});
        const data = definePolicyData({
            [BuiltInPolicyType.IDENTITY]: { ...identity, grants: bindings },
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        });

        const compiled = await engine.evaluate(policy, definePolicyEvaluationContext({
            data,
            withConditions: true,
            realmAttributeName: 'roleRealmId',
        }));

        expect(compiled.condition).toBeDefined();

        const foreignRealmId = '11111111-2222-4333-8444-555555555555';
        const predicate = compileFilters(compiled.condition! as IFilter | IFilters, { caseSensitive: true });

        expect(predicate({ roleRealmId: identity.realmId })).toBeTruthy();
        expect(predicate({ roleRealmId: null })).toBeTruthy();
        expect(predicate({ roleRealmId: foreignRealmId })).toBeFalsy();
        // it binds the NAMED column, not `realmId` riding alongside it
        expect(predicate({ roleRealmId: foreignRealmId, realmId: identity.realmId })).toBeFalsy();

        // and the default is unchanged when no column is named
        const fallback = await engine.evaluate(policy, definePolicyEvaluationContext({
            data,
            withConditions: true,
        }));
        const fallbackPredicate = compileFilters(fallback.condition! as IFilter | IFilters, { caseSensitive: true });

        expect(fallbackPredicate({ realmId: identity.realmId })).toBeTruthy();
        expect(fallbackPredicate({ realmId: foreignRealmId })).toBeFalsy();
        // NOTE deliberately not asserted against a row CARRYING no `realmId` key:
        // the memory adapter unifies a missing column with `null`, which an
        // `ownOrNull` reach matches — the documented fail-open that the adapters'
        // force-select of the gate column exists to prevent.
    });

    // A grant may carry its OWN policy, authored by an operator against the ENTITY the
    // permission names. Nothing rebases such a policy onto a junction's row shape, so
    // lowering it emits SQL over columns that table does not have. Under a declared
    // `realmAttributeName` the whole class is refused: no condition, so the caller falls
    // back to the per-row `post` branch, which evaluates the same policy against the
    // junction's real attributes.
    it.each([
        ['scope-mode realm-match', definePolicyWithType(BuiltInPolicyType.REALM_MATCH, { scope: 'own' })],
        ['attributes', definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { realmId: { $eq: identity.realmId } } })],
    ])('refuses to lower a grant-borne %s policy onto a foreign row model', async (_label, grantPolicy) => {
        const bindings: PermissionPolicyBinding[] = [{
            permission,
            realmScope: 'ownOrNull',
            policies: [grantPolicy],
        }];
        const build = () => new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
        });
        const policy = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {});
        const data = () => definePolicyData({
            [BuiltInPolicyType.IDENTITY]: { ...identity, grants: bindings },
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        });

        const junction = await build().evaluate(policy, definePolicyEvaluationContext({
            data: data(),
            withConditions: true,
            realmAttributeName: 'roleRealmId',
        }));

        expect(junction.pending).toBe(true);
        // no condition => PermissionEvaluator.compile answers `post`, the sound fallback
        expect(junction.condition).toBeUndefined();

        // …while an ordinary entity read, which names no column, still pushes down
        const entity = await build().evaluate(policy, definePolicyEvaluationContext({
            data: data(),
            withConditions: true,
        }));

        expect(entity.condition).toBeDefined();

        const predicate = compileFilters(entity.condition! as IFilter | IFilters, { caseSensitive: true });

        expect(predicate({ realmId: identity.realmId })).toBeTruthy();
    });
});

// A grant policy tree carrying a binding node re-enters this evaluator with the
// same data, which loads the same grants and evaluates the same tree again
// (issue #3633). The evaluator answers such a term as one that cannot be
// evaluated and moves on, never recursing; the consumer side keeps the grant
// and reaches the same branch.
describe('identity permission binding recursion (#3633)', () => {
    const run = (bindings: PermissionPolicyBinding[]) => {
        const engine = new PolicyEngine({
            ...PolicyDefaultEvaluators,
            [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
        });

        return engine.evaluate(
            definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {}),
            definePolicyEvaluationContext({
                data: definePolicyData({
                    [BuiltInPolicyType.IDENTITY]: { ...identity, grants: bindings },
                    [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
                }),
            }),
        );
    };

    it.each([
        ['a bare binding node', definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {})],
        ['a binding node under a composite', definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
            children: [
                definePolicyWithType(BuiltInPolicyType.IDENTITY, {}),
                definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {}),
            ],
        })],
    ])('settles a grant whose policy carries %s false instead of recursing', async (_label, grantPolicy) => {
        const outcome = await run([{
            permission,
            realmScope: 'any',
            policies: [grantPolicy],
        }]);

        expect(outcome.success).toBe(false);
        expect(outcome.pending).toBeFalsy();
        expect((outcome.issues ?? []).map((issue) => issue.code)).toContain(PolicyIssueCode.INVALID);
    });

    it('keeps a sibling policy-free grant passing', async () => {
        const outcome = await run([
            {
                permission,
                realmScope: 'any',
                policies: [definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {})],
            },
            { permission, realmScope: 'any' },
        ]);

        expect(outcome.success).toBe(true);
    });

    // only a composite evaluates its children, and the projection the consumer
    // walks keeps `children` on a composite alone, so a raw tree carrying them
    // under another type is evaluated as that node alone on both sides
    it('ignores children under a non-composite node, as the projection does', async () => {
        // the shape a closure-table read hands over: children on whatever type
        const raw : PolicyWithType = {
            type: BuiltInPolicyType.IDENTITY,
            children: [definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {})],
        };
        const outcome = await run([{
            permission,
            realmScope: 'any',
            policies: [raw],
        }]);

        expect(outcome.success).toBe(true);
    });

    it('settles only the grant whose composite carries a nullish child', async () => {
        const raw : PolicyWithType = { type: BuiltInPolicyType.COMPOSITE, children: [null] };
        const outcome = await run([
            {
                permission,
                realmScope: 'any',
                policies: [raw],
            },
            { permission, realmScope: 'any' },
        ]);

        expect(outcome.success).toBe(true);
    });
});

// The grants are part of the identity's policy data, so evaluation is a
// function of the bag alone. An identity carrying no grants or grants of
// another shape is a settled deny, never pending, since a pre-gate permits
// pending.
describe('identity permission binding grants data', () => {
    const engine = new PolicyEngine({
        ...PolicyDefaultEvaluators,
        [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
    });
    const policy = definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {});
    const bindings : PermissionPolicyBinding[] = [{ permission, realmScope: 'any' }];

    const evaluate = (grants?: unknown) => engine.evaluate(policy, definePolicyEvaluationContext({
        data: definePolicyData({
            [BuiltInPolicyType.IDENTITY]: typeof grants === 'undefined' ?
                identity :
                { ...identity, grants: grants as PermissionPolicyBinding[] },
            [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
        }),
    }));

    it('denies when the identity carries no grants', async () => {
        const outcome = await evaluate();

        expect(outcome.success).toBe(false);
        expect(outcome.pending).toBeFalsy();
        expect((outcome.issues ?? []).map((issue) => issue.code)).toEqual([PolicyIssueCode.DATA_MISSING]);
    });

    it.each([
        ['a string', 'any'],
        ['an object', { bindings }],
        ['a list of scalars', [1]],
        ['a binding without a permission', [{}]],
        ['a binding without a permission name', [{ permission: {} }]],
    ])('denies grants given as %s', async (_label, grants) => {
        const outcome = await evaluate(grants);

        expect(outcome.success).toBe(false);
        expect(outcome.pending).toBeFalsy();
        // refused by the identity data validator, naming the field, rather
        // than crashing the binding evaluator on the malformed entry
        expect((outcome.issues ?? []).map((issue) => issue.message).join()).toMatch(/grants/);
    });

    it('evaluates the grants the identity carries', async () => {
        const outcome = await evaluate(bindings);

        expect(outcome.success).toBe(true);
    });
});

// The grants of a permission are a disjunction with the node's own `invert`. A
// grant term that could not be evaluated is an unknown that never resolves: a
// passing grant still wins, but nothing may be concluded from its absence.
describe('identity permission binding grant disjunction (not evaluable)', () => {
    const engine = new PolicyEngine({
        ...PolicyDefaultEvaluators,
        [BuiltInPolicyType.PERMISSION_BINDING]: new IdentityPermissionBindingPolicyEvaluator(),
    });

    const passing : PermissionPolicyBinding = { permission, realmScope: 'any' };
    const failing : PermissionPolicyBinding = {
        permission,
        realmScope: 'any',
        policies: [definePolicyWithType(BuiltInPolicyType.IDENTITY, { types: ['client'] })],
    };
    const pending : PermissionPolicyBinding = {
        permission,
        realmScope: 'any',
        policies: [definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: 'public' } })],
    };
    const UNEVALUABLE : [string, PermissionPolicyBinding][] = [
        ['a grant policy of an unregistered type', {
            permission,
            realmScope: 'any',
            policies: [{ type: 'unregistered' }],
        }],
        ['a grant policy carrying a binding node', {
            permission,
            realmScope: 'any',
            policies: [definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {})],
        }],
    ];

    const run = (
        bindings: PermissionPolicyBinding[],
        invert: boolean,
        attributes?: Record<string, any>,
    ) => engine.evaluate(
        definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, { invert }),
        definePolicyEvaluationContext({
            data: definePolicyData({
                [BuiltInPolicyType.IDENTITY]: { ...identity, grants: bindings },
                [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
                ...(attributes ? { [BuiltInPolicyType.ATTRIBUTES]: attributes } : {}),
            }),
            withConditions: true,
        }),
    );

    describe.each(UNEVALUABLE)('%s', (_label, unevaluable) => {
        it.each([false, true])('lets a passing grant win (invert: %s)', async (invert) => {
            const outcome = await run([unevaluable, passing], invert);

            expect(outcome.success).toBe(!invert);
            expect(outcome.pending).toBeFalsy();
            expect(outcome.unevaluable).toBeFalsy();
        });

        it.each([false, true])('is not evaluable when no grant passes (invert: %s)', async (invert) => {
            const outcome = await run([failing, unevaluable], invert);

            expect(outcome.success).toBe(false);
            expect(outcome.pending).toBeFalsy();
            expect(outcome.unevaluable).toBe(true);
            expect(outcome.condition).toBeUndefined();
            expect((outcome.issues ?? []).length).toBeGreaterThan(0);
        });

        it('stays pending next to a pending grant, able to pass only', async () => {
            const outcome = await run([unevaluable, pending], false);

            expect(outcome.success).toBe(false);
            expect(outcome.pending).toBe(true);
            expect(outcome.reachable).toEqual('pass');
            expect(outcome.unevaluable).toBeFalsy();
            // where it passes is known, where it fails never arises
            expect(outcome.condition).toBeDefined();
            expect(outcome.failCondition).toBeUndefined();

            const predicate = compileFilters(outcome.condition! as IFilter | IFilters, { caseSensitive: true });

            expect(predicate({ name: 'public' })).toBe(true);
            expect(predicate({ name: 'private' })).toBe(false);

            const [passes, fails] = await Promise.all([
                run([unevaluable, pending], false, { name: 'public' }),
                run([unevaluable, pending], false, { name: 'private' }),
            ]);

            expect(passes.success).toBe(true);
            expect(fails.success).toBe(false);
            expect(fails.unevaluable).toBe(true);
        });

        it('stays pending next to a pending grant when inverted, able to fail only', async () => {
            const outcome = await run([unevaluable, pending], true);

            expect(outcome.success).toBe(false);
            expect(outcome.pending).toBe(true);
            expect(outcome.reachable).toEqual('fail');
            expect(outcome.unevaluable).toBeFalsy();
            expect(outcome.condition).toBeUndefined();

            // and no row turns it into a pass
            for (const row of [{ name: 'public' }, { name: 'private' }]) {
                const settled = await run([unevaluable, pending], true, row);

                expect(settled.success, row.name).toBe(false);
            }
        });

        it('never passes under an inverted composite next to a pending grant', async () => {
            const evaluate = (attributes?: Record<string, any>) => engine.evaluate(
                definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                    invert: true,
                    children: [definePolicyWithType(BuiltInPolicyType.PERMISSION_BINDING, {})],
                }),
                definePolicyEvaluationContext({
                    data: definePolicyData({
                        [BuiltInPolicyType.IDENTITY]: { ...identity, grants: [unevaluable, pending] },
                        [BuiltInPolicyType.PERMISSION_BINDING]: { permission, grants: [] },
                        ...(attributes ? { [BuiltInPolicyType.ATTRIBUTES]: attributes } : {}),
                    }),
                    withConditions: true,
                }),
            );

            const outcome = await evaluate();

            expect(outcome.pending).toBe(true);
            expect(outcome.reachable).toEqual('fail');
            expect(outcome.condition).toBeUndefined();

            for (const row of [{ name: 'public' }, { name: 'private' }]) {
                expect((await evaluate(row)).success, row.name).toBe(false);
            }
        });
    });

    // A grant policy that pends next to something it could not evaluate says which
    // outcome it can still reach, and the binding node passes that on.
    describe('a grant policy that can only still pass or fail', () => {
        const attributes = definePolicyWithType(BuiltInPolicyType.ATTRIBUTES, { query: { name: 'public' } });
        const grant = (decisionStrategy: 'affirmative' | 'unanimous') : PermissionPolicyBinding => ({
            permission,
            realmScope: 'any',
            policies: [definePolicyWithType(BuiltInPolicyType.COMPOSITE, {
                decisionStrategy,
                children: [attributes, { type: 'unregistered' }],
            })],
        });

        it.each([
            ['affirmative', false, 'pass'],
            ['affirmative', true, 'fail'],
            ['unanimous', false, 'fail'],
            ['unanimous', true, 'pass'],
        ] as const)('a %s grant policy (invert: %s) can still %s', async (decisionStrategy, invert, reachable) => {
            const outcome = await run([grant(decisionStrategy)], invert);

            expect(outcome.success).toBe(false);
            expect(outcome.pending).toBe(true);
            expect(outcome.reachable).toEqual(reachable);
            // only the side it can still reach is stated
            expect(!!outcome.condition).toBe(reachable === 'pass');
            expect(!!outcome.failCondition).toBe(reachable === 'fail');
        });

        it('passes an inverted binding node exactly where the unanimous grant policy fails', async () => {
            // public: the grant policy is (true and unknown), which is not evaluable
            const unknown = await run([grant('unanimous')], true, { name: 'public' });

            expect(unknown.success).toBe(false);
            expect(unknown.unevaluable).toBe(true);

            // private: it is (false and unknown), a settled false the node inverts
            const settled = await run([grant('unanimous')], true, { name: 'private' });

            expect(settled.success).toBe(true);
        });

        it('never passes an inverted binding node over the affirmative grant policy', async () => {
            for (const row of [{ name: 'public' }, { name: 'private' }]) {
                const settled = await run([grant('affirmative')], true, row);

                expect(settled.success, row.name).toBe(false);
            }
        });
    });

    it.each([false, true])('inverts a disjunction of failing grants as before (invert: %s)', async (invert) => {
        const outcome = await run([failing], invert);

        expect(outcome.success).toBe(invert);
        expect(outcome.pending).toBeFalsy();
        expect(outcome.unevaluable).toBeFalsy();
    });

    it.each([false, true])('keeps a pending disjunction pending as before (invert: %s)', async (invert) => {
        const outcome = await run([failing, pending], invert);

        expect(outcome.success).toBe(false);
        expect(outcome.pending).toBe(true);
        expect(outcome.unevaluable).toBeFalsy();
        expect(outcome.condition).toBeDefined();
    });
});
